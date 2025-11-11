import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
import os

# ---------------------- Setup ----------------------
st.set_page_config(page_title="Race Analysis Dashboard", layout="wide")
DATA_DIR = os.path.join("datasets_trimmed", "cota_top10")

@st.cache_data
def load_data():
    lap_times = pd.read_csv(os.path.join(DATA_DIR, "top10_lap_times.csv"))
    telemetry = pd.read_csv(os.path.join(DATA_DIR, "top10_telemetry_per_timestamp.csv"))
    driver_stats = pd.read_csv(os.path.join(DATA_DIR, "driver_session_stats.csv"))
    per_lap_summary = pd.read_csv(os.path.join(DATA_DIR, "per_lap_telemetry_summary.csv"))
    
    # Data preprocessing
    telemetry["LAP_ID"] = telemetry["NUMBER"].astype(str) + "_" + telemetry["lap"].astype(str)
    top10_lap_ids = set(lap_times["NUMBER"].astype(str) + "_" + lap_times["LAP_NUMBER"].astype(str))
    telemetry["Top10"] = telemetry["LAP_ID"].isin(top10_lap_ids)
    telemetry["index_in_lap"] = telemetry.groupby("LAP_ID").cumcount()
    
    return lap_times, telemetry, driver_stats, per_lap_summary

lap_times, telemetry, driver_stats, per_lap_summary = load_data()

# ---------------------- Main Dashboard ----------------------
st.title("🏁 Race Analysis Dashboard")
st.markdown("**Toyota GR Circuit Performance Analysis - COTA Top 10**")

# ---------------------- Sidebar Filters ----------------------
st.sidebar.header("Filters")
sessions = st.sidebar.multiselect("Session", options=driver_stats["SOURCE_DIR"].unique(), default=driver_stats["SOURCE_DIR"].unique())
drivers = st.sidebar.multiselect("Drivers", options=sorted(driver_stats["NUMBER"].unique()), default=sorted(driver_stats["NUMBER"].unique())[:5])

# Add custom CSS for better styling
st.markdown("""
<style>
.stSelectbox > div > div {
    background-color: #1e1e1e;
    border: 1px solid #444;
}
.stMultiSelect > div > div {
    background-color: #1e1e1e;
    border: 1px solid #444;
}
.stButton > button {
    background-color: #d72638;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 0.5rem 1rem;
    font-weight: bold;
}
.stButton > button:hover {
    background-color: #b91e2e;
}
</style>
""", unsafe_allow_html=True)

# Filter data
filtered_stats = driver_stats[driver_stats["SOURCE_DIR"].isin(sessions) & driver_stats["NUMBER"].isin(drivers)]
filtered_lap_times = lap_times[lap_times["SOURCE_DIR"].isin(sessions) & lap_times["NUMBER"].isin(drivers)]
filtered_telemetry = telemetry[telemetry["SOURCE_DIR"].isin(sessions) & telemetry["NUMBER"].isin(drivers)]

# ---------------------- Dashboard Tabs ----------------------
tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs(["Overview", "Telemetry", "Lap Breakdown", "Driver Comparison", "Session Summary", "Insights"])

# ---------------------- 1. Overview Dashboard ----------------------
with tab1:
    st.header("Overview Dashboard")
    
    # Quick Stats at top
    col1, col2, col3, col4 = st.columns(4)
    leaderboard = filtered_lap_times.sort_values("LAP_TIME_SEC").reset_index(drop=True)
    leaderboard["Rank"] = range(1, len(leaderboard) + 1)
    
    with col1:
        st.metric("Fastest Lap", f"{leaderboard.iloc[0]['LAP_TIME_SEC']:.3f}s")
    with col2:
        st.metric("Fastest Driver", f"#{leaderboard.iloc[0]['NUMBER']}")
    with col3:
        st.metric("Total Drivers", len(filtered_stats["NUMBER"].unique()))
    with col4:
        st.metric("Sessions", len(filtered_stats["SOURCE_DIR"].unique()))
    
    # Main content in columns
    col1, col2 = st.columns([3, 2])
    
    with col1:
        st.subheader("Top 10 Fastest Laps Leaderboard")
        st.dataframe(leaderboard[["Rank", "NUMBER", "LAP_NUMBER", "LAP_TIME_SEC", "SOURCE_DIR"]], use_container_width=True, height=300)
    
    with col2:
        # Best lap times chart
        best_laps = filtered_stats.groupby("NUMBER")["BestLap(s)"].min().reset_index()
        fig_best = px.bar(best_laps.sort_values("BestLap(s)").head(10), x="NUMBER", y="BestLap(s)", 
                         title="Best Lap Times by Driver", color="BestLap(s)", color_continuous_scale="Viridis")
        fig_best.update_layout(height=350)
        st.plotly_chart(fig_best, use_container_width=True)
    
    # Throttle progression chart
    if not per_lap_summary.empty:
        st.subheader("Throttle Usage Progression")
        fig_prog = px.line(per_lap_summary[per_lap_summary["NUMBER"].isin(drivers)], 
                          x="lap", y="mean_throttle", color="NUMBER", 
                          title="Throttle Usage by Lap")
        fig_prog.update_layout(height=300)
        st.plotly_chart(fig_prog, use_container_width=True)

# ---------------------- 2. Telemetry Comparison ----------------------
with tab2:
    st.header("Telemetry Comparison")
    
    # Compact controls
    col1, col2 = st.columns(2)
    with col1:
        selected_drivers = st.multiselect("Drivers", options=drivers, default=drivers[:3])
    with col2:
        telemetry_metric = st.selectbox("Metric", ["speed", "Steering_Angle", "accx_can", "accy_can", "gear", "nmot"])
    
    if selected_drivers:
        # Multi-driver telemetry plot
        telem_filtered = filtered_telemetry[filtered_telemetry["NUMBER"].isin(selected_drivers)]
        
        if not telem_filtered.empty:
            fig_telem = px.line(telem_filtered, x="index_in_lap", y=telemetry_metric, 
                               color="LAP_ID", title=f"{telemetry_metric} vs Lap Position")
            
            # Highlight top 10 laps
            top10_telem = telem_filtered[telem_filtered["Top10"]]
            if not top10_telem.empty:
                fig_telem.add_scatter(x=top10_telem["index_in_lap"], y=top10_telem[telemetry_metric],
                                    mode="lines", name="Top 10 Laps", line=dict(width=4, color="red"))
            
            st.plotly_chart(fig_telem, use_container_width=True)
        
        # Multi-metric comparison in 2x2 grid
        if not telem_filtered.empty:
            fig_multi = make_subplots(rows=2, cols=2, 
                                    subplot_titles=["Speed", "Steering", "Accel X", "RPM"],
                                    vertical_spacing=0.15)
            
            for i, driver in enumerate(selected_drivers[:4]):
                driver_data = telem_filtered[telem_filtered["NUMBER"] == driver]
                if not driver_data.empty:
                    fig_multi.add_trace(go.Scatter(x=driver_data["index_in_lap"], y=driver_data["speed"], 
                                                 name=f"Driver {driver}", showlegend=True), row=1, col=1)
                    fig_multi.add_trace(go.Scatter(x=driver_data["index_in_lap"], y=driver_data["Steering_Angle"], 
                                                 name=f"Driver {driver}", showlegend=False), row=1, col=2)
                    fig_multi.add_trace(go.Scatter(x=driver_data["index_in_lap"], y=driver_data["accx_can"], 
                                                 name=f"Driver {driver}", showlegend=False), row=2, col=1)
                    fig_multi.add_trace(go.Scatter(x=driver_data["index_in_lap"], y=driver_data["nmot"], 
                                                 name=f"Driver {driver}", showlegend=False), row=2, col=2)
            
            fig_multi.update_layout(height=500, title_text="Multi-Metric Comparison")
            st.plotly_chart(fig_multi, use_container_width=True)

# ---------------------- 3. Lap Breakdown ----------------------
with tab3:
    st.header("Lap Breakdown")
    
    # Lap selector
    col1, col2 = st.columns(2)
    with col1:
        breakdown_driver = st.selectbox("Driver", options=drivers)
    with col2:
        driver_laps = filtered_lap_times[filtered_lap_times["NUMBER"] == breakdown_driver]["LAP_NUMBER"].unique()
        breakdown_lap = st.selectbox("Lap", options=sorted(driver_laps))
    
    if breakdown_driver and breakdown_lap:
        # Lap summary
        lap_data = filtered_lap_times[(filtered_lap_times["NUMBER"] == breakdown_driver) & 
                                    (filtered_lap_times["LAP_NUMBER"] == breakdown_lap)]
        
        if not lap_data.empty:
            st.subheader(f"Driver {breakdown_driver} - Lap {breakdown_lap} Summary")
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Lap Time", f"{lap_data.iloc[0]['LAP_TIME_SEC']:.3f}s")
            with col2:
                st.metric("Session", lap_data.iloc[0]['SOURCE_DIR'])
            
            # Telemetry for selected lap
            lap_telemetry = filtered_telemetry[(filtered_telemetry["NUMBER"] == breakdown_driver) & 
                                             (filtered_telemetry["lap"] == breakdown_lap)]
            
            if not lap_telemetry.empty:
                # Speed profile with braking zones
                fig_speed_profile = go.Figure()
                fig_speed_profile.add_trace(go.Scatter(x=lap_telemetry["index_in_lap"], y=lap_telemetry["speed"],
                                                     mode="lines", name="Speed", line=dict(color="blue")))
                
                # Add braking zones (where speed drops significantly)
                speed_diff = lap_telemetry["speed"].diff()
                braking_zones = lap_telemetry[speed_diff < -5]  # Significant speed drops
                if not braking_zones.empty:
                    fig_speed_profile.add_trace(go.Scatter(x=braking_zones["index_in_lap"], y=braking_zones["speed"],
                                                         mode="markers", name="Braking Zones", 
                                                         marker=dict(color="red", size=8)))
                
                # Side by side charts
                col1, col2 = st.columns(2)
                
                with col1:
                    fig_speed_profile.update_layout(title="Speed Profile", height=300)
                    st.plotly_chart(fig_speed_profile, use_container_width=True)
                
                with col2:
                    fig_accel_brake = make_subplots(specs=[[{"secondary_y": True}]])
                    fig_accel_brake.add_trace(go.Scatter(x=lap_telemetry["index_in_lap"], y=lap_telemetry["accx_can"],
                                                       name="Accel X", line=dict(color="green")))
                    fig_accel_brake.add_trace(go.Scatter(x=lap_telemetry["index_in_lap"], y=lap_telemetry["accy_can"],
                                                       name="Accel Y", line=dict(color="orange")), secondary_y=True)
                    fig_accel_brake.update_layout(title="Acceleration", height=300)
                    st.plotly_chart(fig_accel_brake, use_container_width=True)

# ---------------------- 4. Driver Comparison ----------------------
with tab4:
    st.header("Driver Comparison")
    
    # Scatter plots
    col1, col2 = st.columns(2)
    
    with col1:
        # Performance vs Consistency
        fig_perf_cons = px.scatter(filtered_stats, x="BestLap(s)", y="StdDev(s)", 
                                  color="SOURCE_DIR", size="Laps", hover_data=["NUMBER"],
                                  title="Performance vs Consistency")
        st.plotly_chart(fig_perf_cons, use_container_width=True)
    
    with col2:
        # Telemetry comparison
        if not per_lap_summary.empty:
            summary_filtered = per_lap_summary[per_lap_summary["NUMBER"].isin(drivers)]
            fig_throttle_brake = px.scatter(summary_filtered, x="mean_throttle", y="mean_brake",
                                          color="NUMBER", size="steering_smoothness",
                                          title="Throttle vs Brake Usage")
            st.plotly_chart(fig_throttle_brake, use_container_width=True)
    
    # Radar chart for driver skills
    st.subheader("Driver Skills Radar")
    if len(drivers) > 0:
        radar_data = []
        for driver in drivers[:5]:  # Limit to 5 drivers for readability
            driver_data = filtered_stats[filtered_stats["NUMBER"] == driver]
            if not driver_data.empty:
                # Normalize metrics (lower is better for lap time and std dev)
                consistency = 1 / (driver_data["StdDev(s)"].mean() + 0.1)  # Avoid division by zero
                pace = 1 / (driver_data["BestLap(s)"].mean() / 140)  # Normalize around 140s
                
                radar_data.append({
                    "Driver": f"Driver {driver}",
                    "Consistency": consistency,
                    "Pace": pace,
                    "Experience": driver_data["Laps"].sum() / 20  # Normalize laps
                })
        
        if radar_data:
            radar_df = pd.DataFrame(radar_data)
            fig_radar = go.Figure()
            
            for _, row in radar_df.iterrows():
                fig_radar.add_trace(go.Scatterpolar(
                    r=[row["Consistency"], row["Pace"], row["Experience"]],
                    theta=["Consistency", "Pace", "Experience"],
                    fill="toself",
                    name=row["Driver"]
                ))
            
            fig_radar.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 2])),
                                  title="Driver Skills Comparison")
            st.plotly_chart(fig_radar, use_container_width=True)

# ---------------------- 5. Session Summary ----------------------
with tab5:
    st.header("Session Summary")
    
    # Summary table
    st.subheader("Driver Performance Summary")
    summary_table = filtered_stats.groupby("NUMBER").agg({
        "BestLap(s)": "min",
        "AvgLap(s)": "mean", 
        "StdDev(s)": "mean",
        "Laps": "sum"
    }).round(3).reset_index()
    summary_table = summary_table.sort_values("BestLap(s)")
    st.dataframe(summary_table, use_container_width=True)
    
    # Lap time distribution
    st.subheader("Lap Time Distribution")
    if not per_lap_summary.empty:
        # Create violin plot for lap time distribution
        fig_violin = go.Figure()
        for driver in drivers[:8]:  # Limit for readability
            driver_summary = per_lap_summary[per_lap_summary["NUMBER"] == driver]
            if not driver_summary.empty and "lap_time" in driver_summary.columns:
                fig_violin.add_trace(go.Violin(y=driver_summary["lap_time"], name=f"Driver {driver}"))
        
        fig_violin.update_layout(title="Lap Time Distribution by Driver", yaxis_title="Lap Time (s)")
        st.plotly_chart(fig_violin, use_container_width=True)
    
    # Session evolution
    st.subheader("Performance Evolution (COTA1 vs COTA2)")
    session_comparison = filtered_stats.pivot_table(index="NUMBER", columns="SOURCE_DIR", 
                                                   values="BestLap(s)", aggfunc="min").reset_index()
    
    if "cota1" in session_comparison.columns and "cota2" in session_comparison.columns:
        session_comparison["improvement"] = session_comparison["cota1"] - session_comparison["cota2"]
        
        fig_improvement = px.bar(session_comparison.dropna(), x="NUMBER", y="improvement",
                               title="Lap Time Improvement (COTA1 to COTA2)",
                               color="improvement", color_continuous_scale="RdYlGn")
        fig_improvement.add_hline(y=0, line_dash="dash", line_color="black")
        st.plotly_chart(fig_improvement, use_container_width=True)

# ---------------------- 6. Insights & AI Commentary ----------------------
with tab6:
    st.header("Insights & AI Commentary")
    
    # Generate insights
    if not filtered_stats.empty:
        # Most consistent driver
        most_consistent = filtered_stats.loc[filtered_stats["StdDev(s)"].idxmin()]
        
        # Fastest driver
        fastest_driver = filtered_stats.loc[filtered_stats["BestLap(s)"].idxmin()]
        
        # Most improved driver
        if "cota1" in filtered_stats["SOURCE_DIR"].values and "cota2" in filtered_stats["SOURCE_DIR"].values:
            improvement_data = filtered_stats.pivot_table(index="NUMBER", columns="SOURCE_DIR", 
                                                        values="BestLap(s)", aggfunc="min")
            if "cota1" in improvement_data.columns and "cota2" in improvement_data.columns:
                improvement_data["improvement"] = improvement_data["cota1"] - improvement_data["cota2"]
                most_improved = improvement_data["improvement"].idxmax()
        
        st.subheader("Key Insights")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.info(f"**Most Consistent Driver**\n\nDriver #{most_consistent['NUMBER']} shows the most consistent lap times with a standard deviation of {most_consistent['StdDev(s)']:.3f}s across {most_consistent['Laps']} laps.")
        
        with col2:
            st.success(f"**Fastest Driver**\n\nDriver #{fastest_driver['NUMBER']} achieved the fastest lap time of {fastest_driver['BestLap(s)']:.3f}s in session {fastest_driver['SOURCE_DIR']}.")
        
        with col3:
            if 'most_improved' in locals():
                improvement_val = improvement_data.loc[most_improved, "improvement"]
                st.warning(f"**Most Improved**\n\nDriver #{most_improved} improved by {improvement_val:.3f}s from COTA1 to COTA2, showing significant progress between sessions.")
        
        # Telemetry insights
        st.subheader("Telemetry Insights")
        if not per_lap_summary.empty:
            # Throttle discipline analysis
            throttle_analysis = per_lap_summary.groupby("NUMBER")["mean_throttle"].agg(["mean", "std"]).reset_index()
            throttle_analysis["discipline"] = throttle_analysis["mean"] / (throttle_analysis["std"] + 1)
            best_throttle_discipline = throttle_analysis.loc[throttle_analysis["discipline"].idxmax()]
            
            st.info(f"**Throttle Discipline**: Driver #{best_throttle_discipline['NUMBER']} shows the best throttle discipline with consistent usage patterns.")
            
            # Steering smoothness
            steering_analysis = per_lap_summary.groupby("NUMBER")["steering_smoothness"].mean().reset_index()
            smoothest_driver = steering_analysis.loc[steering_analysis["steering_smoothness"].idxmin()]
            
            st.success(f"**Smoothest Driver**: Driver #{smoothest_driver['NUMBER']} demonstrates the smoothest steering inputs, indicating excellent car control.")