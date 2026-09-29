"""
Classical Discrete Particle Swarm Optimization (PSO) for VRP.
Milestone 3: Permutation-Aware Swarm Optimization Baseline.

Mathematical Interpretation:
In continuous PSO, position and velocity are vectors in R^D governed by:
    v_{t+1} = w * v_t + c1 * r1 * (pbest - x_t) + c2 * r2 * (gbest - x_t)
    x_{t+1} = x_t + v_{t+1}

For combinatorial permutation spaces like VRP, continuous linear algebra cannot be
directly applied without producing invalid permutations. We employ the discrete
Swap Operator (SO) and Swap Sequence (SS) algebra (Clerc, 2004):

1. Position X_i is a discrete VRP route partition (permutation with vehicle cuts).
2. Velocity V_i is an ordered Swap Sequence SS = [SO_1, SO_2, ..., SO_k].
3. Permutation Difference (A ⊖ B) computes the minimal swap sequence transforming B into A.
4. Velocity Truncation (c ⊙ SS) retains each swap with probability c.
5. Velocity Addition (SS_1 ⊕ SS_2) concatenates swap sequences.
6. Position Update (X ⊕ V) applies the swap sequence to transform the candidate tour.
7. Partition Adaptation perturbates vehicle assignment boundaries.
8. Solution Repair guarantees 100% customer uniqueness with exactly-once visitation.
"""

import time
import random
from typing import List, Dict, Any, Optional, Tuple

from models.vrp_models import VRPProblemDefinition, VRPMatrixInfo, VehicleRoute
from optimization.encoding import (
    DiscreteVRPSolution,
    SwapSequence,
    compute_permutation_difference,
    create_initial_random_solution,
)
from optimization.objective import ObjectiveFunction, shared_objective_function


class PSOParticle:
    """Individual search particle in the discrete VRP swarm."""

    def __init__(self, initial_solution: DiscreteVRPSolution):
        self.position: DiscreteVRPSolution = initial_solution.copy()
        self.velocity: SwapSequence = SwapSequence()
        self.fitness: float = float("inf")
        self.breakdown: Dict[str, Any] = {}

        self.pbest_position: DiscreteVRPSolution = initial_solution.copy()
        self.pbest_fitness: float = float("inf")


class PSOSolver:
    """
    Classical Discrete Particle Swarm Optimization Solver for CVRP-TW.
    Serves as the conventional metaheuristic baseline in IROS.
    """

    def __init__(
        self,
        population_size: int = 40,
        max_iterations: int = 80,
        w: float = 0.7,  # Inertia weight
        c1: float = 1.5,  # Cognitive acceleration
        c2: float = 1.5,  # Social acceleration
        objective: Optional[ObjectiveFunction] = None,
        random_seed: Optional[int] = None,
    ):
        self.population_size = max(10, population_size)
        self.max_iterations = max(10, max_iterations)
        self.w = w
        self.c1 = c1
        self.c2 = c2
        self.objective = objective or shared_objective_function
        self.random_seed = random_seed
        self.rng = random.Random(random_seed) if random_seed is not None else random.Random()

    def solve(
        self,
        problem: VRPProblemDefinition,
        matrix_info: VRPMatrixInfo,
    ) -> Dict[str, Any]:
        """
        Executes discrete PSO search for near-optimal customer orderings and vehicle assignments.
        """
        start_time = time.perf_counter()

        all_customer_ids = [c.id for c in problem.customers]
        num_vehicles = len(problem.vehicles) if problem.vehicles else 2

        if not all_customer_ids:
            return {
                "algorithm": "Classical PSO",
                "status": "error",
                "message": "No customers to optimize.",
            }

        # 1. Swarm Initialization
        swarm: List[PSOParticle] = []
        gbest_position: Optional[DiscreteVRPSolution] = None
        gbest_fitness: float = float("inf")
        gbest_routes: List[VehicleRoute] = []
        gbest_breakdown: Dict[str, Any] = {}

        # Seed initial particles with random and balanced assignments
        for p_idx in range(self.population_size):
            init_sol = create_initial_random_solution(all_customer_ids, num_vehicles, self.rng)
            init_sol = init_sol.repair_and_validate(all_customer_ids)
            particle = PSOParticle(init_sol)

            # Evaluate initial particle
            fit, bdown, c_res, routes = self.objective.evaluate(
                particle.position.routes, problem, matrix_info
            )
            particle.fitness = fit
            particle.breakdown = bdown
            particle.pbest_fitness = fit
            particle.pbest_position = particle.position.copy()

            if fit < gbest_fitness:
                gbest_fitness = fit
                gbest_position = particle.position.copy()
                gbest_routes = routes
                gbest_breakdown = bdown

            swarm.append(particle)

        convergence_history: List[float] = [gbest_fitness]
        iteration_snapshots: List[Dict[str, Any]] = [
            {
                "iteration": 0,
                "fitness": gbest_fitness,
                "distance_km": gbest_breakdown.get("raw_metrics", {}).get("distance_km", 0.0),
                "travel_time_min": gbest_breakdown.get("raw_metrics", {}).get("total_duration_min", 0.0),
                "routes": [list(r) for r in gbest_position.routes] if gbest_position else [],
            }
        ]

        # 2. Main Optimization Loop
        for iteration in range(1, self.max_iterations + 1):
            # Dynamic inertia weight reduction: balances exploration early and exploitation late
            current_w = self.w - (self.w - 0.4) * (iteration / self.max_iterations)

            for particle in swarm:
                # Extract permutation and cuts
                curr_tour, curr_cuts = particle.position.to_giant_tour()
                pbest_tour, pbest_cuts = particle.pbest_position.to_giant_tour()
                gbest_tour, gbest_cuts = gbest_position.to_giant_tour()

                # A. Velocity update using Swap Sequences
                # Component 1: Inertia (w ⊙ V_t)
                v_inertia = particle.velocity.truncate(current_w, self.rng)

                # Component 2: Cognitive (c1 * r1 ⊙ (P_best ⊖ X_t))
                diff_pbest = compute_permutation_difference(pbest_tour, curr_tour)
                r1 = self.rng.random()
                v_cognitive = diff_pbest.truncate(min(1.0, self.c1 * r1), self.rng)

                # Component 3: Social (c2 * r2 ⊙ (G_best ⊖ X_t))
                diff_gbest = compute_permutation_difference(gbest_tour, curr_tour)
                r2 = self.rng.random()
                v_social = diff_gbest.truncate(min(1.0, self.c2 * r2), self.rng)

                # Combined Velocity: V_{t+1} = V_inertia ⊕ V_cognitive ⊕ V_social
                new_velocity = v_inertia.concat(v_cognitive).concat(v_social)
                particle.velocity = new_velocity

                # B. Position update (X_{t+1} = X_t ⊕ V_{t+1})
                new_tour = new_velocity.apply(curr_tour)

                # Particle partition cuts update: stochastic interpolation towards gbest / pbest cuts
                new_cuts = list(curr_cuts)
                for c_idx in range(len(new_cuts)):
                    if self.rng.random() < 0.3:
                        new_cuts[c_idx] = gbest_cuts[c_idx]
                    elif self.rng.random() < 0.2:
                        new_cuts[c_idx] = pbest_cuts[c_idx]

                new_sol = DiscreteVRPSolution.from_giant_tour(new_tour, new_cuts, num_vehicles)

                # C. Local Search Mutation / Boundary Perturbation
                if self.rng.random() < 0.25:
                    new_sol = new_sol.mutate_2opt(self.rng)
                if self.rng.random() < 0.2:
                    new_sol = new_sol.mutate_vehicle_shift(self.rng)

                # D. Repair ensuring strict customer uniqueness
                new_sol = new_sol.repair_and_validate(all_customer_ids)
                particle.position = new_sol

                # E. Objective Evaluation
                fit, bdown, c_res, routes = self.objective.evaluate(
                    particle.position.routes, problem, matrix_info
                )
                particle.fitness = fit
                particle.breakdown = bdown

                # F. Update Personal Best
                if fit < particle.pbest_fitness:
                    particle.pbest_fitness = fit
                    particle.pbest_position = particle.position.copy()

                # G. Update Global Best
                if fit < gbest_fitness:
                    gbest_fitness = fit
                    gbest_position = particle.position.copy()
                    gbest_routes = routes
                    gbest_breakdown = bdown

            convergence_history.append(gbest_fitness)
            if iteration == 1 or iteration % 10 == 0 or iteration == self.max_iterations:
                iteration_snapshots.append({
                    "iteration": iteration,
                    "fitness": gbest_fitness,
                    "distance_km": gbest_breakdown.get("raw_metrics", {}).get("distance_km", 0.0),
                    "travel_time_min": gbest_breakdown.get("raw_metrics", {}).get("total_duration_min", 0.0),
                    "routes": [list(r) for r in gbest_position.routes] if gbest_position else [],
                })

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Construct final telemetry
        return {
            "algorithm": "Classical PSO",
            "status": "success",
            "is_feasible": gbest_breakdown.get("is_feasible", False),
            "best_fitness": gbest_fitness,
            "convergence_history": convergence_history,
            "iteration_snapshots": iteration_snapshots,
            "iterations_completed": self.max_iterations,
            "population_size": self.population_size,
            "execution_time_ms": round(elapsed_ms, 2),
            "fitness_breakdown": gbest_breakdown,
            "total_distance_km": gbest_breakdown.get("raw_metrics", {}).get("distance_km", 0.0),
            "total_travel_time_min": gbest_breakdown.get("raw_metrics", {}).get("total_duration_min", 0.0),
            "best_routes": gbest_position.routes if gbest_position else [],
            "decoded_routes": gbest_routes,
            "parameters": {
                "population_size": self.population_size,
                "iterations": self.max_iterations,
                "w": self.w,
                "c1": self.c1,
                "c2": self.c2,
                "random_seed": self.random_seed,
            },
        }
