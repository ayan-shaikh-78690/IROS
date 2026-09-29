/**
 * IROS API Service Abstraction
 * Intelligent Route Optimization System • Team VEDIORA
 * Handles communication with the FastAPI backend.
 */

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export async function fetchHealth() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      service: 'vediora-backend',
      error: err.message,
    };
  }
}

export async function fetchOptimizationStatus() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/optimization/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Optimization info returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'unreachable',
      error: err.message,
    };
  }
}

export async function submitOptimizationJob(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/optimization/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message,
    };
  }
}

export async function fetchGraphSchema() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/routes/graph-schema`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Graph schema returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'schema_ready',
      city: 'Ahmedabad–Gandhinagar, Gujarat',
      nodes: [],
      edges: [],
      cost_formula: {
        w_time: 0.4,
        w_distance: 0.4,
        w_congestion: 0.2,
        formulation: 'Weight = w_time * norm_time + w_distance * norm_distance + w_congestion * norm_congestion',
      },
      routing_metrics_status: 'Routing metrics will be calculated in M2.2',
    };
  }
}

export async function calculateRoadRoute(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/routes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Routing engine error (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Unable to calculate a road route right now. Please check the selected locations and try again.',
    };
  }
}

export async function fetchCostMatrix(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/routes/matrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Matrix calculation error (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Unable to calculate cost matrix right now.',
    };
  }
}

export async function fetchVrpMatrix(problem) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/vrp/matrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(problem),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `VRP matrix error (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Unable to generate VRP cost matrix.',
    };
  }
}

export async function decodeVrpSolution(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/vrp/decode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `VRP decode error (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Unable to decode candidate VRP solution.',
    };
  }
}

export async function evaluateVrpSolution(payload) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/vrp/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `VRP evaluate error (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Unable to evaluate candidate VRP solution.',
    };
  }
}

export async function fetchVrpFormulation() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/vrp/formulation`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Formulation endpoint returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}



