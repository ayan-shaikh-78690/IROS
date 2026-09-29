"""
OSM Service Interface.
Responsible for acquiring real road network topology from OpenStreetMap using OSMnx.
Implementation scheduled for Milestone 2.
"""
from typing import Optional, Dict, Any

class OSMService:
    """Service interface for OpenStreetMap network acquisition."""
    
    def __init__(self, default_region: str = "New Delhi, India", network_type: str = "drive"):
        self.default_region = default_region
        self.network_type = network_type
    
    def download_network(self, place_name: str, network_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Download road network graph for a given place.
        To be implemented in Milestone 2 using osmnx.graph_from_place.
        """
        raise NotImplementedError("OSM network acquisition will be implemented in Milestone 2.")

    def download_network_bbox(self, north: float, south: float, east: float, west: float) -> Dict[str, Any]:
        """
        Download road network within a bounding box.
        To be implemented in Milestone 2.
        """
        raise NotImplementedError("OSM bbox acquisition will be implemented in Milestone 2.")
