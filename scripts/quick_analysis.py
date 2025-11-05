#!/usr/bin/env python3
"""
Quick Toyota GR Racing Data Analysis
Demonstrates key visualization and correlation techniques
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from scipy import stats
import glob

# Load data
def load_data():
    driver_stats = pd.read_csv('../datasets_clean/driver_session_stats.csv')
    telemetry = pd.read_csv('../datasets_clean/per_lap_telemetry_summary.csv')
    weather = pd.read_csv('../datasets/circuit-of-the-americas/COTA/Race 1/26_Weather_Race 1_Anonymized.csv', sep=';')
    
    # Combine all lap data
    lap_files = glob.glob('../datasets_clean/driver_*.csv')
    all_laps = pd.concat([pd.read_csv(f) for f in lap_files], ignore_index=True)
    
    return driver_stats, telemetry, weather, all_laps

# 1. Performance Distribution
def plot_performance_distribution(driver_stats):
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    
    # Best lap distribution
    axes[0,0].hist(driver_stats['BestLap(s)'], bins=12, alpha=0.7)
    axes[0,0].set_title('Best Lap Time Distribution')
    axes[0,0].set_xlabel('Time (s)')
    
    # Speed vs Consistency
    axes[0,1].scatter(driver_stats['AvgLap(s)'], driver_stats['StdDev(s)'], 
                     c=driver_stats['BestLap(s)'], cmap='viridis')
    axes[0,1].set_xlabel('Avg Lap (s)')
    axes[0,1].set_ylabel('Std Dev (s)')
    axes[0,1].set_title('Speed vs Consistency')
    
    # Sector comparison
    sectors = driver_stats[['S1Best', 'S2Best', 'S3Best']]
    axes[1,0].boxplot([sectors['S1Best'], sectors['S2Best'], sectors['S3Best']], 
                     labels=['S1', 'S2', 'S3'])
    axes[1,0].set_title('Sector Performance')
    
    # Theoretical vs Actual
    axes[1,1].scatter(driver_stats['TheoreticalBest(s)'], driver_stats['BestLap(s)'])
    axes[1,1].plot([148, 154], [148, 154], 'r--', alpha=0.5)
    axes[1,1].set_xlabel('Theoretical Best')
    axes[1,1].set_ylabel('Actual Best')
    axes[1,1].set_title('Potential vs Reality')
    
    plt.tight_layout()
    plt.show()

# 2. Telemetry Correlation
def analyze_telemetry_correlation(telemetry, all_laps):
    # Merge telemetry with lap times
    merged = telemetry.merge(all_laps[['NUMBER', 'LAP_NUMBER', 'LAP_TIME_SEC']], 
                           left_on=['NUMBER', 'lap'], right_on=['NUMBER', 'LAP_NUMBER'])
    
    # Correlation matrix
    corr_data = merged[['mean_throttle', 'mean_brake', 'steering_smoothness', 'LAP_TIME_SEC']]
    correlation = corr_data.corr()
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(correlation, annot=True, cmap='RdBu_r', center=0)
    plt.title('Telemetry vs Performance Correlations')
    plt.show()
    
    return merged

# 3. Weather Impact
def plot_weather_trends(weather):
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    
    # Temperature trends
    axes[0,0].plot(weather['AIR_TEMP'], label='Air')
    axes[0,0].plot(weather['TRACK_TEMP'], label='Track')
    axes[0,0].set_title('Temperature Trends')
    axes[0,0].legend()
    
    # Wind conditions
    axes[0,1].scatter(weather['WIND_DIRECTION'], weather['WIND_SPEED'])
    axes[0,1].set_xlabel('Wind Direction')
    axes[0,1].set_ylabel('Wind Speed')
    axes[0,1].set_title('Wind Conditions')
    
    # Humidity
    axes[1,0].plot(weather['HUMIDITY'])
    axes[1,0].set_title('Humidity Changes')
    
    # Air vs Track temp correlation
    axes[1,1].scatter(weather['AIR_TEMP'], weather['TRACK_TEMP'])
    axes[1,1].set_xlabel('Air Temp')
    axes[1,1].set_ylabel('Track Temp')
    axes[1,1].set_title('Air vs Track Temperature')
    
    plt.tight_layout()
    plt.show()

# 4. Driver Comparison
def compare_top_drivers(driver_stats, all_laps):
    top_5 = driver_stats.nsmallest(5, 'BestLap(s)')
    
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    
    # Best lap comparison
    axes[0].bar(top_5['DriverNumber'].astype(str), top_5['BestLap(s)'])
    axes[0].set_title('Top 5 Drivers - Best Laps')
    axes[0].set_ylabel('Time (s)')
    
    # Lap progression for top 3
    for driver in top_5['DriverNumber'].head(3):
        driver_laps = all_laps[all_laps['NUMBER'] == driver].sort_values('LAP_NUMBER')
        axes[1].plot(driver_laps['LAP_NUMBER'], driver_laps['LAP_TIME_SEC'], 
                    marker='o', label=f'Driver {driver}')
    
    axes[1].set_xlabel('Lap Number')
    axes[1].set_ylabel('Lap Time (s)')
    axes[1].set_title('Lap Time Progression')
    axes[1].legend()
    
    plt.tight_layout()
    plt.show()

# 5. Statistical Analysis
def statistical_analysis(driver_stats):
    # Performance efficiency
    driver_stats['efficiency'] = driver_stats['TheoreticalBest(s)'] / driver_stats['BestLap(s)']
    driver_stats['consistency'] = 1 / (1 + driver_stats['StdDev(s)'])
    
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    
    # Efficiency distribution
    axes[0].hist(driver_stats['efficiency'], bins=10, alpha=0.7)
    axes[0].set_title('Performance Efficiency Distribution')
    axes[0].set_xlabel('Efficiency (Theoretical/Actual)')
    
    # Efficiency vs Consistency
    axes[1].scatter(driver_stats['efficiency'], driver_stats['consistency'],
                   s=driver_stats['Laps']*3, alpha=0.7)
    axes[1].set_xlabel('Efficiency')
    axes[1].set_ylabel('Consistency Score')
    axes[1].set_title('Efficiency vs Consistency')
    
    plt.tight_layout()
    plt.show()
    
    # Print insights
    best_efficiency = driver_stats.loc[driver_stats['efficiency'].idxmax()]
    most_consistent = driver_stats.loc[driver_stats['consistency'].idxmax()]
    
    print(f"\nMost efficient: Driver {best_efficiency['DriverNumber']} ({best_efficiency['efficiency']:.3f})")
    print(f"Most consistent: Driver {most_consistent['DriverNumber']} ({most_consistent['consistency']:.3f})")

def main():
    print("Loading Toyota GR Racing Data...")
    driver_stats, telemetry, weather, all_laps = load_data()
    
    print(f"Loaded: {len(driver_stats)} drivers, {len(all_laps)} laps, {len(weather)} weather points")
    
    print("\n1. Performance Distribution Analysis")
    plot_performance_distribution(driver_stats)
    
    print("\n2. Telemetry Correlation Analysis")
    merged_telemetry = analyze_telemetry_correlation(telemetry, all_laps)
    
    print("\n3. Weather Impact Analysis")
    plot_weather_trends(weather)
    
    print("\n4. Driver Comparison")
    compare_top_drivers(driver_stats, all_laps)
    
    print("\n5. Statistical Analysis")
    statistical_analysis(driver_stats)
    
    # Summary statistics
    print(f"\n=== RACE SUMMARY ===")
    print(f"Fastest lap: {driver_stats['BestLap(s)'].min():.3f}s")
    print(f"Slowest lap: {driver_stats['BestLap(s)'].max():.3f}s")
    print(f"Average best lap: {driver_stats['BestLap(s)'].mean():.3f}s")
    print(f"Track temp range: {weather['TRACK_TEMP'].min():.1f}°C - {weather['TRACK_TEMP'].max():.1f}°C")

if __name__ == "__main__":
    main()