"""
Discrete VRP Route Encoding and Permutation Transformation Utilities.
Milestones M2.2-B / M3 / M4.

Provides:
1. Permutation-based solution representation with vehicle partitioning.
2. Delimiter-based and multi-chromosome encoding/decoding.
3. Swap Operator (SO) and Swap Sequence (SS) algebra for Discrete PSO.
4. Permutation difference operator (A ⊖ B) and swap application (A ⊕ SS).
5. Solution repair and normalization ensuring 100% customer uniqueness (no duplicates, no omissions).
6. Neighborhood mutation operators (2-opt, swap, insertion, vehicle shift) for metaheuristics.
"""

from typing import List, Tuple, Dict, Any, Optional
import random
import copy


class SwapOperator:
    """
    Elementary swap operator SO(i, j) on a permutation sequence.
    Exchanges elements at index i and index j.
    """

    def __init__(self, i: int, j: int):
        self.i = min(i, j)
        self.j = max(i, j)

    def apply(self, perm: List[Any]) -> List[Any]:
        """Applies swap operator to permutation in place or returns new list."""
        n = len(perm)
        if 0 <= self.i < n and 0 <= self.j < n and self.i != self.j:
            perm[self.i], perm[self.j] = perm[self.j], perm[self.i]
        return perm

    def __repr__(self) -> str:
        return f"SO({self.i}, {self.j})"

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, SwapOperator):
            return False
        return self.i == other.i and self.j == other.j


class SwapSequence:
    """
    Ordered sequence of swap operators representing velocity in discrete PSO:
    SS = [SO_1, SO_2, ..., SO_k]
    """

    def __init__(self, operators: Optional[List[SwapOperator]] = None):
        self.operators: List[SwapOperator] = operators or []

    def add(self, so: SwapOperator):
        if so.i != so.j:
            self.operators.append(so)

    def apply(self, perm: List[Any]) -> List[Any]:
        """Applies the sequence of swap operators to a permutation."""
        result = list(perm)
        for so in self.operators:
            so.apply(result)
        return result

    def truncate(self, probability: float, rng: Optional[random.Random] = None) -> "SwapSequence":
        """
        Scalar multiplication operator (c ⊙ SS) for discrete PSO.
        Each swap operator in the sequence is preserved with probability c in [0, 1].
        """
        rand = rng or random
        retained = [so for so in self.operators if rand.random() < probability]
        return SwapSequence(retained)

    def concat(self, other: "SwapSequence") -> "SwapSequence":
        """Concatenation operator (SS1 ⊕ SS2) for discrete PSO velocities."""
        return SwapSequence(self.operators + other.operators)

    def __len__(self) -> int:
        return len(self.operators)

    def __repr__(self) -> str:
        return f"SS({self.operators})"


def compute_permutation_difference(perm_target: List[Any], perm_source: List[Any]) -> SwapSequence:
    """
    Difference operator (A ⊖ B) for discrete PSO.
    Computes the minimal swap sequence required to transform perm_source into perm_target.
    Complexity: O(N) using cycle decomposition.
    """
    assert len(perm_target) == len(perm_source), "Permutations must have identical lengths"
    target = list(perm_target)
    current = list(perm_source)
    n = len(target)

    # Position lookup map for current permutation
    pos_map = {val: idx for idx, val in enumerate(current)}
    swap_seq = SwapSequence()

    for i in range(n):
        target_val = target[i]
        curr_val = current[i]

        if curr_val != target_val:
            # Find where target_val currently is
            j = pos_map[target_val]

            # Record swap operator SO(i, j)
            swap_seq.add(SwapOperator(i, j))

            # Apply swap in current array
            current[i], current[j] = current[j], current[i]

            # Update position map
            pos_map[curr_val] = j
            pos_map[target_val] = i

    return swap_seq


class DiscreteVRPSolution:
    """
    Discrete combinatorial VRP candidate solution.
    Represents partitioned vehicle routes:
    Vehicle 0: Depot -> [stop_0, stop_1, ...] -> Depot
    Vehicle 1: Depot -> [stop_k, ...] -> Depot
    ...
    """

    def __init__(self, routes: List[List[str]], num_vehicles: int):
        self.num_vehicles = num_vehicles
        # Clean routes: ensure exactly num_vehicles partitions (some may be empty)
        self.routes: List[List[str]] = [list(r) for r in routes]
        while len(self.routes) < num_vehicles:
            self.routes.append([])
        if len(self.routes) > num_vehicles:
            # Merge excess routes into earlier vehicles
            for r in self.routes[num_vehicles:]:
                self.routes[0].extend(r)
            self.routes = self.routes[:num_vehicles]

    def to_giant_tour(self) -> Tuple[List[str], List[int]]:
        """
        Converts partitioned routes into a giant customer permutation + partition cut indices.
        Example: routes = [['C1', 'C4'], ['C2', 'C3', 'C5']]
        -> giant_tour = ['C1', 'C4', 'C2', 'C3', 'C5'], cuts = [2]
        """
        giant_tour: List[str] = []
        cuts: List[int] = []
        acc = 0
        for i, r in enumerate(self.routes[:-1]):
            giant_tour.extend(r)
            acc += len(r)
            cuts.append(acc)
        giant_tour.extend(self.routes[-1])
        return giant_tour, cuts

    @classmethod
    def from_giant_tour(
        cls, giant_tour: List[str], cuts: List[int], num_vehicles: int
    ) -> "DiscreteVRPSolution":
        """Reconstructs partitioned routes from a giant tour and cut indices."""
        routes: List[List[str]] = []
        prev = 0
        sorted_cuts = sorted(cuts)
        for cut in sorted_cuts:
            cut_clamped = max(0, min(len(giant_tour), cut))
            routes.append(giant_tour[prev:cut_clamped])
            prev = cut_clamped
        routes.append(giant_tour[prev:])

        return cls(routes, num_vehicles)

    def get_all_visited_customers(self) -> List[str]:
        """Returns all visited customer IDs in sequence."""
        visited: List[str] = []
        for r in self.routes:
            visited.extend(r)
        return visited

    def copy(self) -> "DiscreteVRPSolution":
        return DiscreteVRPSolution([list(r) for r in self.routes], self.num_vehicles)

    def repair_and_validate(self, all_customers: List[str]) -> "DiscreteVRPSolution":
        """
        Guarantees that every customer in all_customers appears EXACTLY once.
        Eliminates duplicate visits and appends any omitted customers to the route with least demand.
        """
        target_set = set(all_customers)
        seen = set()
        cleaned_routes: List[List[str]] = []

        for r in self.routes:
            cleaned_r = []
            for cid in r:
                if cid in target_set and cid not in seen:
                    cleaned_r.append(cid)
                    seen.add(cid)
            cleaned_routes.append(cleaned_r)

        # Re-insert any missing customers
        missing = [cid for cid in all_customers if cid not in seen]
        for cid in missing:
            # Add to the vehicle with the shortest route length
            shortest_idx = min(range(self.num_vehicles), key=lambda i: len(cleaned_routes[i]))
            cleaned_routes[shortest_idx].append(cid)

        return DiscreteVRPSolution(cleaned_routes, self.num_vehicles)

    # Neighborhood Mutation / Search Operators
    def mutate_swap(self, rng: Optional[random.Random] = None) -> "DiscreteVRPSolution":
        """Exchanges two random customers between any vehicles."""
        rand = rng or random
        giant_tour, cuts = self.to_giant_tour()
        if len(giant_tour) >= 2:
            i, j = rand.sample(range(len(giant_tour)), 2)
            giant_tour[i], giant_tour[j] = giant_tour[j], giant_tour[i]
        return DiscreteVRPSolution.from_giant_tour(giant_tour, cuts, self.num_vehicles)

    def mutate_insertion(self, rng: Optional[random.Random] = None) -> "DiscreteVRPSolution":
        """Removes a customer from one position and inserts it into another."""
        rand = rng or random
        giant_tour, cuts = self.to_giant_tour()
        if len(giant_tour) >= 2:
            src = rand.randrange(len(giant_tour))
            dest = rand.randrange(len(giant_tour))
            if src != dest:
                elem = giant_tour.pop(src)
                giant_tour.insert(dest, elem)
        return DiscreteVRPSolution.from_giant_tour(giant_tour, cuts, self.num_vehicles)

    def mutate_2opt(self, rng: Optional[random.Random] = None) -> "DiscreteVRPSolution":
        """Reverses a sub-sequence within a single vehicle route (classical 2-opt move)."""
        rand = rng or random
        sol = self.copy()
        non_empty = [i for i, r in enumerate(sol.routes) if len(r) >= 2]
        if non_empty:
            v_idx = rand.choice(non_empty)
            route = sol.routes[v_idx]
            i, j = sorted(rand.sample(range(len(route)), 2))
            route[i : j + 1] = reversed(route[i : j + 1])
        return sol

    def mutate_vehicle_shift(self, rng: Optional[random.Random] = None) -> "DiscreteVRPSolution":
        """Moves a customer from a busier vehicle to an emptier vehicle."""
        rand = rng or random
        sol = self.copy()
        non_empty = [i for i, r in enumerate(sol.routes) if len(r) > 0]
        if len(non_empty) >= 1 and self.num_vehicles > 1:
            src_v = rand.choice(non_empty)
            dest_v = rand.choice([v for v in range(self.num_vehicles) if v != src_v])
            stop_idx = rand.randrange(len(sol.routes[src_v]))
            moved_stop = sol.routes[src_v].pop(stop_idx)
            insert_pos = rand.randrange(len(sol.routes[dest_v]) + 1)
            sol.routes[dest_v].insert(insert_pos, moved_stop)
        return sol


def create_initial_random_solution(
    customer_ids: List[str], num_vehicles: int, rng: Optional[random.Random] = None
) -> DiscreteVRPSolution:
    """Creates a random valid discrete VRP candidate solution."""
    rand = rng or random
    shuffled = list(customer_ids)
    rand.shuffle(shuffled)

    routes: List[List[str]] = [[] for _ in range(num_vehicles)]
    # Distribute customers across vehicles
    for i, cid in enumerate(shuffled):
        routes[i % num_vehicles].append(cid)

    return DiscreteVRPSolution(routes, num_vehicles)
