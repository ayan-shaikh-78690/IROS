"""
VEDIORA Optimization Engine Package.
Modules for Classical PSO, Quantum QPSO, Shared Objective Function, Constraints, and Route Encodings.
Milestones M2.2-B / M3 / M4.
"""

from optimization.encoding import (
    DiscreteVRPSolution,
    SwapOperator,
    SwapSequence,
    compute_permutation_difference,
    create_initial_random_solution,
)
from optimization.constraints import (
    VRPConstraintEngine,
    ConstraintValidationResult,
    constraint_engine,
)
from optimization.objective import (
    ObjectiveFunction,
    shared_objective_function,
)
from optimization.pso import PSOSolver
from optimization.qpso import QPSOSolver

__all__ = [
    "DiscreteVRPSolution",
    "SwapOperator",
    "SwapSequence",
    "compute_permutation_difference",
    "create_initial_random_solution",
    "VRPConstraintEngine",
    "ConstraintValidationResult",
    "constraint_engine",
    "ObjectiveFunction",
    "shared_objective_function",
    "PSOSolver",
    "QPSOSolver",
]
