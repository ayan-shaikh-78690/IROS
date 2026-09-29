"""
Graph Service Interface.
Responsible for converting OSM networks into weighted NetworkX graphs,
node snapping, and computing all-pairs shortest paths.
Implementation scheduled for Milestone 2 and Milestone 3.
"""
from typing import Dict, Any, Tuple

class GraphService:
    """Service interface for NetworkX road graph operations."""

    def __init__(self):
        self.graph = None

    def load_graph(self, graph_data: Any) -> None:
        """Load and initialize NetworkX directed multigraph."""
        raise NotImplementedError("Graph loading will be implemented in Milestone 2.")

    def find_nearest_node(self, lat: float, lng: float) -> int:
        """Find the nearest graph node to given coordinates using spatial indexing."""
        raise NotImplementedError("Nearest node search will be implemented in Milestone 2.")

    def compute_distance_matrix(self, node_ids: list) -> Dict[Tuple[int, int], float]:
        """Compute all-pairs shortest path distance matrix."""
        raise NotImplementedError("Shortest path matrix computation will be implemented in Milestone 3.")
