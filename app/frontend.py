# app.py
import streamlit as st
import pandas as pd
import plotly.express as px
import os

# ---------------------- Setup ----------------------
DATA_DIR = os.path.join("datasets_trimmed", "cota_top10")

# Load CSVs
lap_times = pd.read_csv(os.path.join(DATA_DIR, "top10_lap_times.csv"))
telemetry = pd.read_csv(os.path.join(DATA_DIR, "top10_telemetry_per_timestamp.csv"))
driver_stats = pd.read_csv(os.path.join(DATA_DIR, "driver_session_stats.csv"))
per_lap_summary = pd.read_csv(os.path.join(DATA_DIR, "per_lap_telemetry_summary.csv"))

# Create LAP_ID for telemetry
telemetry["LAP_ID"] = telemetry["NUMBER"].astype(str) + "_" + telemetry["lap"].astype(str)

# Mark top 10 laps
top10_lap_ids = set(lap_times["NUMBER"].astype(str) + "_" + lap_times["LAP_NUMBER"].astype(str))
telemetry["Top10"] = telemetry["LAP_ID"].isin(top10_lap_ids)

# Reset index per lap for x-axis
telemetry["index_in_lap"] = telemetry.groupby("LAP_ID").cumcount()

# ---------------------- Sidebar ----------------------
st.sidebar.title("Driver Selection")
drivers = sorted(lap_times["NUMBER"].unique())
selected_driver = st.sidebar.selectbox("Select Driver Number for Details", drivers)

laps_for_driver = sorted(lap_times[lap_times["NUMBER"] == selected_driver]["LAP_NUMBER"])
selected_lap = st.sidebar.selectbox("Select Lap Number", laps_for_driver)

# ---------------------- Top Graph: All Drivers ----------------------
st.header("All Drivers - Speed Comparison")

fig_all = px.line(
    telemetry,
    x="index_in_lap",
    y="speed",
    color="NUMBER",
    line_group="LAP_ID",
    hover_data=["NUMBER", "lap", "speed"],
    title="Speed vs Lap Index (All Drivers)"
)

# Highlight top 10 laps
top10_df = telemetry[telemetry["Top10"]]
fig_all.add_scatter(
    x=top10_df["index_in_lap"],
    y=top10_df["speed"],
    mode="lines",
    line=dict(color="red", width=3),
    name="Top 10 Laps"
)

st.plotly_chart(fig_all, use_container_width=True)

# ---------------------- Driver Lap Info ----------------------
st.header(f"Driver {selected_driver} - Lap {selected_lap}")

lap_info = lap_times[(lap_times["NUMBER"] == selected_driver) & (lap_times["LAP_NUMBER"] == selected_lap)]
st.subheader("Lap Times")
st.table(lap_info.drop(columns=["NUMBER", "SOURCE_DIR"]))

# ---------------------- Telemetry Graphs ----------------------
st.subheader("Telemetry Data")

telemetry_filtered = telemetry[(telemetry["NUMBER"] == selected_driver) & 
                               (telemetry["lap"] == selected_lap)]

if telemetry_filtered.empty:
    st.warning("No telemetry data for this lap.")
else:
    telemetry_filtered["timestamp"] = pd.to_datetime(telemetry_filtered["timestamp"])

    # Speed over time
    fig_speed = px.line(telemetry_filtered, x="timestamp", y="speed", title="Speed (kph) vs Time")
    st.plotly_chart(fig_speed, use_container_width=True)

    # Steering angle over time
    fig_steer = px.line(telemetry_filtered, x="timestamp", y="Steering_Angle", title="Steering Angle vs Time")
    st.plotly_chart(fig_steer, use_container_width=True)

    # Acceleration x/y
    fig_acc = px.line(
        telemetry_filtered,
        x="timestamp",
        y=["accx_can", "accy_can"], 
        title="Acceleration X/Y vs Time"
    )
    st.plotly_chart(fig_acc, use_container_width=True)

# ---------------------- Per-Lap Summary ----------------------
st.subheader("Per Lap Telemetry Summary")
lap_summary_filtered = per_lap_summary[per_lap_summary["NUMBER"] == selected_driver]
st.dataframe(lap_summary_filtered)

# ---------------------- Driver Stats ----------------------
st.subheader("Driver Session Stats")
driver_stats_filtered = driver_stats[driver_stats["NUMBER"] == selected_driver]
st.dataframe(driver_stats_filtered)