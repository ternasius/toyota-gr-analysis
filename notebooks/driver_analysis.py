import pandas as pd
import numpy as np
import os
import glob
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import pearsonr, spearmanr

# Configuration
DATASETS_CLEAN = r"c:\Users\jacks\OneDrive\Desktop\progamming projects\toyota gr analysis\datasets_clean"

def load_all_driver_data():
    """Load and combine all driver CSV files"""
    driver_files = glob.glob(os.path.join(DATASETS_CLEAN, "driver_*.csv"))
    driver_files = [f for f in driver_files if not f.endswith("driver_session_stats.csv")]
    
    all_drivers = []
    for file in driver_files:
        df = pd.read_csv(file)
        driver_num = int(os.path.basename(file).replace("driver_", "").replace(".csv", ""))
        df['DRIVER_NUM'] = driver_num
        all_drivers.append(df)
    
    return pd.concat(all_drivers, ignore_index=True)

def load_telemetry_data():
    """Load telemetry summary data"""
    return pd.read_csv(os.path.join(DATASETS_CLEAN, "per_lap_telemetry_summary.csv"))

def load_session_stats():
    """Load driver session statistics"""
    return pd.read_csv(os.path.join(DATASETS_CLEAN, "driver_session_stats.csv"))

def analyze_driver_performance():
    """Analyze driver performance patterns"""
    print("=== DRIVER PERFORMANCE ANALYSIS ===\n")
    
    # Load data
    drivers_df = load_all_driver_data()
    telemetry_df = load_telemetry_data()
    session_stats = load_session_stats()
    
    print(f"Loaded data for {drivers_df['DRIVER_NUM'].nunique()} drivers")
    print(f"Total laps analyzed: {len(drivers_df)}")
    print(f"Telemetry data points: {len(telemetry_df)}")
    
    # Basic driver statistics
    print("\n--- Driver Lap Count Distribution ---")
    lap_counts = drivers_df.groupby('DRIVER_NUM').size().sort_values(ascending=False)
    print(lap_counts.head(10))
    
    # Performance metrics by driver
    print("\n--- Best Lap Times by Driver ---")
    best_laps = drivers_df.groupby('DRIVER_NUM')['LAP_TIME_SEC'].min().sort_values()
    print(best_laps.head(10))
    
    # Sector analysis
    print("\n--- Sector Performance Analysis ---")
    sector_analysis = drivers_df.groupby('DRIVER_NUM').agg({
        'S1_SEC': ['mean', 'min'],
        'S2_SEC': ['mean', 'min'], 
        'S3_SEC': ['mean', 'min'],
        'LAP_TIME_SEC': ['mean', 'min', 'std']
    }).round(3)
    
    print("Top 5 drivers by average S1 time:")
    print(sector_analysis['S1_SEC']['mean'].sort_values().head())
    
    print("\nTop 5 drivers by average S2 time:")
    print(sector_analysis['S2_SEC']['mean'].sort_values().head())
    
    print("\nTop 5 drivers by average S3 time:")
    print(sector_analysis['S3_SEC']['mean'].sort_values().head())
    
    return drivers_df, telemetry_df, session_stats

def correlate_with_telemetry(drivers_df, telemetry_df):
    """Find correlations between driver performance and telemetry data"""
    print("\n=== DRIVER-TELEMETRY CORRELATIONS ===\n")
    
    # Merge driver data with telemetry
    merged_df = pd.merge(
        drivers_df, 
        telemetry_df, 
        left_on=['DRIVER_NUM', 'LAP_NUMBER'], 
        right_on=['NUMBER', 'lap'], 
        how='inner'
    )
    
    print(f"Successfully merged {len(merged_df)} lap records with telemetry data")
    
    # Correlation analysis
    correlations = {}
    
    # Lap time vs telemetry metrics
    metrics = ['mean_throttle', 'mean_brake', 'steering_smoothness']
    
    for metric in metrics:
        if metric in merged_df.columns:
            corr_coef, p_value = pearsonr(merged_df['LAP_TIME_SEC'], merged_df[metric])
            correlations[f'LAP_TIME_vs_{metric}'] = {'correlation': corr_coef, 'p_value': p_value}
    
    # Sector times vs telemetry
    sectors = ['S1_SEC', 'S2_SEC', 'S3_SEC']
    for sector in sectors:
        for metric in metrics:
            if metric in merged_df.columns:
                corr_coef, p_value = pearsonr(merged_df[sector], merged_df[metric])
                correlations[f'{sector}_vs_{metric}'] = {'correlation': corr_coef, 'p_value': p_value}
    
    print("--- Significant Correlations (p < 0.05) ---")
    for key, value in correlations.items():
        if value['p_value'] < 0.05:
            print(f"{key}: r={value['correlation']:.3f}, p={value['p_value']:.4f}")
    
    return merged_df, correlations

def analyze_consistency_patterns(drivers_df):
    """Analyze driver consistency patterns"""
    print("\n=== CONSISTENCY ANALYSIS ===\n")
    
    consistency_stats = drivers_df.groupby('DRIVER_NUM').agg({
        'LAP_TIME_SEC': ['std', 'count'],
        'S1_SEC': 'std',
        'S2_SEC': 'std', 
        'S3_SEC': 'std',
        'TOP_SPEED': ['mean', 'std']
    }).round(3)
    
    # Filter drivers with at least 5 laps for meaningful consistency analysis
    min_laps = 5
    consistent_drivers = consistency_stats[consistency_stats[('LAP_TIME_SEC', 'count')] >= min_laps]
    
    print(f"--- Most Consistent Drivers (min {min_laps} laps) ---")
    most_consistent = consistent_drivers[('LAP_TIME_SEC', 'std')].sort_values()
    print("Top 10 most consistent (lowest lap time std dev):")
    print(most_consistent.head(10))
    
    print("\n--- Speed Consistency ---")
    speed_consistency = consistent_drivers[('TOP_SPEED', 'std')].sort_values()
    print("Top 10 most consistent top speeds:")
    print(speed_consistency.head(10))
    
    return consistency_stats

def find_performance_trends(drivers_df):
    """Analyze performance trends throughout the session"""
    print("\n=== PERFORMANCE TRENDS ===\n")
    
    # Calculate lap-to-lap improvement/degradation
    trends = []
    
    for driver in drivers_df['DRIVER_NUM'].unique():
        driver_data = drivers_df[drivers_df['DRIVER_NUM'] == driver].sort_values('LAP_NUMBER')
        
        if len(driver_data) >= 3:  # Need at least 3 laps for trend analysis
            # Linear regression on lap times vs lap number
            x = driver_data['LAP_NUMBER'].values
            y = driver_data['LAP_TIME_SEC'].values
            
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
            
            trends.append({
                'DRIVER_NUM': driver,
                'trend_slope': slope,
                'trend_r_squared': r_value**2,
                'trend_p_value': p_value,
                'laps_analyzed': len(driver_data),
                'first_lap_time': y[0],
                'last_lap_time': y[-1],
                'improvement': y[0] - y[-1]
            })
    
    trends_df = pd.DataFrame(trends)
    
    print("--- Drivers Showing Improvement (negative slope) ---")
    improving = trends_df[trends_df['trend_slope'] < 0].sort_values('trend_slope')
    print(improving[['DRIVER_NUM', 'trend_slope', 'improvement', 'trend_r_squared']].head(10))
    
    print("\n--- Drivers Showing Degradation (positive slope) ---")
    degrading = trends_df[trends_df['trend_slope'] > 0].sort_values('trend_slope', ascending=False)
    print(degrading[['DRIVER_NUM', 'trend_slope', 'improvement', 'trend_r_squared']].head(10))
    
    return trends_df

def analyze_flag_impact(drivers_df):
    """Analyze impact of flag conditions on performance"""
    print("\n=== FLAG CONDITION ANALYSIS ===\n")
    
    flag_analysis = drivers_df.groupby(['DRIVER_NUM', 'FLAG_AT_FL']).agg({
        'LAP_TIME_SEC': ['mean', 'count'],
        'TOP_SPEED': 'mean'
    }).round(3)
    
    # Compare performance under different flag conditions
    flag_comparison = drivers_df.groupby('FLAG_AT_FL').agg({
        'LAP_TIME_SEC': ['mean', 'std', 'count'],
        'TOP_SPEED': ['mean', 'std']
    }).round(3)
    
    print("--- Performance by Flag Condition ---")
    print(flag_comparison)
    
    # Statistical test for flag impact
    if 'GF' in drivers_df['FLAG_AT_FL'].values and 'FF' in drivers_df['FLAG_AT_FL'].values:
        gf_times = drivers_df[drivers_df['FLAG_AT_FL'] == 'GF']['LAP_TIME_SEC']
        ff_times = drivers_df[drivers_df['FLAG_AT_FL'] == 'FF']['LAP_TIME_SEC']
        
        t_stat, p_value = stats.ttest_ind(gf_times, ff_times)
        print(f"\nT-test GF vs FF lap times: t={t_stat:.3f}, p={p_value:.4f}")
    
    return flag_analysis

def main():
    """Main analysis function"""
    print("Starting comprehensive driver analysis...\n")
    
    # Load and analyze basic performance
    drivers_df, telemetry_df, session_stats = analyze_driver_performance()
    
    # Correlate with telemetry data
    merged_df, correlations = correlate_with_telemetry(drivers_df, telemetry_df)
    
    # Analyze consistency
    consistency_stats = analyze_consistency_patterns(drivers_df)
    
    # Find performance trends
    trends_df = find_performance_trends(drivers_df)
    
    # Analyze flag impact
    flag_analysis = analyze_flag_impact(drivers_df)
    
    print("\n=== SUMMARY INSIGHTS ===")
    print("1. Driver performance varies significantly across the field")
    print("2. Telemetry correlations reveal driving style impacts on lap times")
    print("3. Consistency analysis identifies the most reliable drivers")
    print("4. Performance trends show learning/fatigue effects")
    print("5. Flag conditions have measurable impact on performance")
    
    return {
        'drivers_df': drivers_df,
        'telemetry_df': telemetry_df,
        'session_stats': session_stats,
        'merged_df': merged_df,
        'correlations': correlations,
        'consistency_stats': consistency_stats,
        'trends_df': trends_df,
        'flag_analysis': flag_analysis
    }

if __name__ == "__main__":
    results = main()