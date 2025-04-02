from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import math
import statistics
from datetime import datetime

# Global dictionary to store the latest evaluations
latest_evaluations_store: Dict[tuple, Dict[str, Any]] = {}

class RouteDataInput(BaseModel):
    student_name: str = "Unknown Student"
    campus_name: str = "Unknown Campus"
    distances: List[float] = Field(..., description="List of route distances in km", min_items=1)
    times: List[float] = Field(..., description="List of route times in minutes", min_items=1)

def safe_division(numerator, denominator, default=0.0):
    """Avoid division by zero."""
    if denominator == 0:
        return default
    return numerator / denominator

def standard_deviation(values: List[float]) -> float:
    """Calculate standard deviation, return 0 if less than 2 values."""
    if len(values) < 2:
        return 0.0
    return statistics.stdev(values)

def percentile(arr: List[float], p: int) -> float | None:
    """Calculate percentile, handle empty list."""
    if not arr: return None
    arr_sorted = sorted(arr)
    k = (len(arr_sorted) - 1) * (p / 100)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c: return arr_sorted[int(k)]
    d0 = arr_sorted[int(f)] * (c - k)
    d1 = arr_sorted[int(c)] * (k - f)
    return d0 + d1

def calculate_route_diversity(routes_count: int) -> Dict[str, Any]:
    alternatives = max(0, routes_count - 1)
    return {
        "alternativeCount": alternatives,
        "diversityScore": safe_division(alternatives, routes_count)
    }

def analyze_variation(values: List[float]) -> Dict[str, Any]:
    if not values: return {"min": None, "max": None, "avg": None, "stdDev": None, "range": None, "coefficientOfVariation": None, "percentiles": {"p25": None, "p50": None, "p75": None}, "values": []}
    avg = statistics.mean(values)
    std_dev = standard_deviation(values)
    min_val = min(values)
    max_val = max(values)
    return {"values": values, "min": min_val, "max": max_val, "avg": avg, "stdDev": std_dev, "range": max_val - min_val, "percentiles": {"p25": percentile(values, 25), "p50": percentile(values, 50), "p75": percentile(values, 75)}, "coefficientOfVariation": safe_division(std_dev, avg)}

def estimate_congestion(distances_km: List[float], times_min: List[float]) -> Dict[str, Any]:
    if not distances_km or len(distances_km) != len(times_min): return {"avgTimePerKm": None, "congestionScore": None}
    time_per_km = [safe_division(t, d) for t, d in zip(times_min, distances_km) if d > 0]
    if not time_per_km: return {"avgTimePerKm": None, "congestionScore": None}
    avg_time_per_km = statistics.mean(time_per_km)
    min_time_per_km = min(time_per_km)
    max_time_per_km = max(time_per_km)
    congestion_score = safe_division(max_time_per_km, min_time_per_km, default=1.0)
    return {"avgTimePerKm": avg_time_per_km, "congestionScore": congestion_score}

def compute_route_quality(distances_km: List[float], times_min: List[float]) -> Dict[str, Any]:
    if not distances_km or not times_min or len(distances_km) != len(times_min): return {"score": None, "bestRouteIndex": -1}
    avg_time = statistics.mean(times_min)
    min_time = min(times_min)
    avg_distance = statistics.mean(distances_km)
    min_distance = min(distances_km)
    congestion_metrics = estimate_congestion(distances_km, times_min)
    congestion_score = congestion_metrics.get("congestionScore")
    time_eff = safe_division(min_time, avg_time, default=1.0)
    dist_eff = safe_division(min_distance, avg_distance, default=1.0)
    congestion_factor = safe_division(1.0, congestion_score, default=1.0)
    quality_score = (time_eff * 0.5 + dist_eff * 0.3 + congestion_factor * 0.2) * 10
    best_route_index = times_min.index(min_time) if times_min else -1
    return {"score": quality_score, "bestRouteIndex": best_route_index, "components": {"timeEfficiencyRatio": time_eff, "distanceEfficiencyRatio": dist_eff, "inverseCongestionRatio": congestion_factor}}

route_evaluation_router = APIRouter()

@route_evaluation_router.post('/evaluate-routes-data', summary="Calculate and store route evaluation from frontend data")
async def evaluate_and_store_routes_from_data(
    route_data: RouteDataInput = Body(...)
):
    distances = route_data.distances
    times = route_data.times
    student_name = route_data.student_name
    campus_name = route_data.campus_name

    if len(distances) != len(times):
        raise HTTPException(status_code=400, detail="Mismatched distances and times count.")

    route_count = len(distances)

    # --- Perform Calculations ---
    diversity_metrics = calculate_route_diversity(route_count)
    distance_stats_detailed = analyze_variation(distances)
    time_stats_detailed = analyze_variation(times)
    congestion_metrics = estimate_congestion(distances, times)
    quality_metrics = compute_route_quality(distances, times)

    evaluation_results = {
        "metadata": {
            "studentName": student_name,
            "campusName": campus_name,
            "routeCount": route_count,
            "calculationTimestamp": datetime.now().isoformat() 
        },
        "routeDiversity": {
             "alternativeCount": diversity_metrics["alternativeCount"],
             "diversityScore": diversity_metrics["diversityScore"],
             "hasDiversity": diversity_metrics["alternativeCount"] > 0
         },
        "distanceStats": {
            "values": distance_stats_detailed["values"], 
            "min": distance_stats_detailed["min"],
            "max": distance_stats_detailed["max"],
            "avg": distance_stats_detailed["avg"],
            "stdDev": distance_stats_detailed["stdDev"],
            "range": distance_stats_detailed["range"],
            "percentiles": distance_stats_detailed["percentiles"]
        },
        "timeStats": {
            "values": time_stats_detailed["values"], 
            "min": time_stats_detailed["min"],
            "max": time_stats_detailed["max"],
            "avg": time_stats_detailed["avg"],
            "stdDev": time_stats_detailed["stdDev"],
            "range": time_stats_detailed["range"],
            "percentiles": time_stats_detailed["percentiles"]
        },
        "efficiencyMetrics": {
            "timeDistanceRatios": [round(safe_division(t, d), 3) for t, d in zip(times, distances) if d > 0],
            "averageTimePerKm": congestion_metrics["avgTimePerKm"],
            "congestionScore": congestion_metrics["congestionScore"], # Added
            "routeQualityScore": quality_metrics["score"],
            "bestRouteIndex": quality_metrics["bestRouteIndex"]
        }
    }

    # --- Store the result ---
    storage_key = (student_name, campus_name)
    latest_evaluations_store[storage_key] = {
        "data": evaluation_results,
        "timestamp": datetime.now() # Timestamp of storage
    }
    print(f"Stored evaluation for {storage_key} at {latest_evaluations_store[storage_key]['timestamp']}") # Server log

    # Optionally return the same data back to the frontend (as before)
    return JSONResponse(content=evaluation_results)


@route_evaluation_router.get('/evaluate-routes', summary="Get latest stored route evaluation for Notebook")
async def get_latest_evaluation_for_notebook(
    student_name: str = Query("Unknown Student"),  # Match the exact default 
    campus_name: str = Query("USJ-R Main Campus")
):
    storage_key = (student_name, campus_name)
    print(f"GET request received with key: {storage_key}")  # Add debug log
    
    print(f"Available keys in store: {list(latest_evaluations_store.keys())}")  # Show what's available
    
    stored_result = latest_evaluations_store.get(storage_key)
    """
    Retrieves the most recently calculated and stored route evaluation
    for the specified student and campus, intended for consumption by
    analysis tools like Jupyter notebooks.
    """
    storage_key = (student_name, campus_name)
    stored_result = latest_evaluations_store.get(storage_key)

    if stored_result:
        print(f"Retrieved stored evaluation for {storage_key} (stored at {stored_result['timestamp']})") # Server log
        # Return the actual data part that was stored
        return JSONResponse(content=stored_result["data"])
    else:
        # Return 404 if no data has been stored for this combination yet
        raise HTTPException(
            status_code=404,
            detail=f"No evaluation data found for student '{student_name}' and campus '{campus_name}'. "
                   f"Please perform a route calculation in the frontend GIS application first."
        )