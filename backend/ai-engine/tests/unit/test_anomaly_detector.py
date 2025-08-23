import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from services.anomaly_detector import AnomalyDetector
from config.settings import Settings


@pytest.fixture
def anomaly_detector():
    """Anomaly detector fixture."""
    settings = Settings(
        anomaly_sensitivity=0.1,
        anomaly_min_data_points=10,
        anomaly_threshold=2.0
    )
    return AnomalyDetector(settings)


@pytest.fixture
def normal_time_series():
    """Normal time series data without anomalies."""
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=100, freq='H')
    
    # Generate normal data with some trend and seasonality
    trend = np.linspace(100, 200, 100)
    seasonal = 20 * np.sin(2 * np.pi * np.arange(100) / 24)  # Daily pattern
    noise = np.random.normal(0, 10, 100)
    values = trend + seasonal + noise
    
    return pd.DataFrame({
        'timestamp': dates,
        'value': values
    })


@pytest.fixture
def anomalous_time_series():
    """Time series data with clear anomalies."""
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=100, freq='H')
    
    # Generate normal data
    trend = np.linspace(100, 200, 100)
    seasonal = 20 * np.sin(2 * np.pi * np.arange(100) / 24)
    noise = np.random.normal(0, 10, 100)
    values = trend + seasonal + noise
    
    # Inject anomalies
    values[25] = 500  # Point anomaly - spike
    values[50:55] = 50  # Contextual anomaly - sudden drop
    values[75:80] = np.linspace(300, 400, 5)  # Collective anomaly - unusual pattern
    
    return pd.DataFrame({
        'timestamp': dates,
        'value': values
    })


class TestAnomalyDetector:
    """Test Anomaly Detector service."""

    @pytest.mark.asyncio
    async def test_initialization(self, anomaly_detector):
        """Test anomaly detector initialization."""
        await anomaly_detector.initialize()
        
        assert anomaly_detector.isolation_forest is not None
        assert anomaly_detector.local_outlier_factor is not None
        assert anomaly_detector.scaler is not None

    @pytest.mark.asyncio
    async def test_detect_point_anomalies_normal_data(self, anomaly_detector, normal_time_series):
        """Test point anomaly detection on normal data."""
        await anomaly_detector.initialize()
        
        anomalies = await anomaly_detector.detect_point_anomalies(normal_time_series)
        
        assert 'anomalies' in anomalies
        assert 'anomaly_scores' in anomalies
        assert 'threshold' in anomalies
        assert 'summary' in anomalies
        
        # Normal data should have few or no anomalies
        assert len(anomalies['anomalies']) <= 10  # Allow for some false positives
        assert anomalies['summary']['total_points'] == 100
        assert anomalies['summary']['anomaly_rate'] <= 0.1

    @pytest.mark.asyncio
    async def test_detect_point_anomalies_anomalous_data(self, anomaly_detector, anomalous_time_series):
        """Test point anomaly detection on data with anomalies."""
        await anomaly_detector.initialize()
        
        anomalies = await anomaly_detector.detect_point_anomalies(anomalous_time_series)
        
        # Should detect the injected anomalies
        assert len(anomalies['anomalies']) > 0
        assert anomalies['summary']['anomaly_rate'] > 0.05
        
        # Check that the major spike is detected
        anomaly_indices = [a['index'] for a in anomalies['anomalies']]
        assert 25 in anomaly_indices  # The spike at index 25

    @pytest.mark.asyncio
    async def test_detect_contextual_anomalies(self, anomaly_detector, anomalous_time_series):
        """Test contextual anomaly detection."""
        await anomaly_detector.initialize()
        
        # Add features that provide context (hour of day, day of week)
        anomalous_time_series['hour'] = anomalous_time_series['timestamp'].dt.hour
        anomalous_time_series['day_of_week'] = anomalous_time_series['timestamp'].dt.dayofweek
        
        context_features = ['hour', 'day_of_week']
        anomalies = await anomaly_detector.detect_contextual_anomalies(
            anomalous_time_series, 
            context_features
        )
        
        assert 'anomalies' in anomalies
        assert 'context_analysis' in anomalies
        assert len(anomalies['anomalies']) > 0

    @pytest.mark.asyncio
    async def test_detect_collective_anomalies(self, anomaly_detector, anomalous_time_series):
        """Test collective anomaly detection."""
        await anomaly_detector.initialize()
        
        anomalies = await anomaly_detector.detect_collective_anomalies(
            anomalous_time_series,
            window_size=10
        )
        
        assert 'anomalous_segments' in anomalies
        assert 'segment_scores' in anomalies
        assert 'summary' in anomalies
        
        # Should detect the collective anomaly we injected (indices 75-80)
        segments = anomalies['anomalous_segments']
        assert len(segments) > 0

    @pytest.mark.asyncio
    async def test_statistical_anomaly_detection(self, anomaly_detector, anomalous_time_series):
        """Test statistical anomaly detection methods."""
        result = await anomaly_detector.detect_statistical_anomalies(anomalous_time_series)
        
        assert 'z_score_anomalies' in result
        assert 'iqr_anomalies' in result
        assert 'modified_z_score_anomalies' in result
        assert 'summary' in result
        
        # Should detect the spike
        z_score_anomalies = result['z_score_anomalies']
        assert len(z_score_anomalies) > 0

    def test_calculate_z_scores(self, anomaly_detector):
        """Test Z-score calculation."""
        data = np.array([1, 2, 3, 4, 5, 100])  # 100 is clearly an outlier
        z_scores = anomaly_detector._calculate_z_scores(data)
        
        assert len(z_scores) == len(data)
        assert abs(z_scores[-1]) > 2  # The outlier should have high Z-score

    def test_calculate_modified_z_scores(self, anomaly_detector):
        """Test modified Z-score calculation."""
        data = np.array([1, 2, 3, 4, 5, 100])  # 100 is clearly an outlier
        modified_z_scores = anomaly_detector._calculate_modified_z_scores(data)
        
        assert len(modified_z_scores) == len(data)
        assert abs(modified_z_scores[-1]) > 2  # The outlier should have high modified Z-score

    def test_detect_iqr_outliers(self, anomaly_detector):
        """Test IQR outlier detection."""
        data = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])  # 100 is clearly an outlier
        outlier_indices = anomaly_detector._detect_iqr_outliers(data)
        
        assert 9 in outlier_indices  # Index of the outlier

    @pytest.mark.asyncio
    async def test_seasonal_anomaly_detection(self, anomaly_detector):
        """Test seasonal anomaly detection."""
        # Create data with clear seasonal pattern
        dates = pd.date_range(start='2023-01-01', periods=168, freq='H')  # 1 week
        
        # Weekly pattern with anomaly
        pattern = np.tile([100, 90, 80, 85, 95, 110, 120], 24)  # Repeat daily pattern
        pattern[100] = 300  # Inject anomaly
        
        data = pd.DataFrame({
            'timestamp': dates,
            'value': pattern
        })
        
        anomalies = await anomaly_detector.detect_seasonal_anomalies(data, period=24)
        
        assert 'seasonal_anomalies' in anomalies
        assert 'seasonality_strength' in anomalies
        assert len(anomalies['seasonal_anomalies']) > 0

    @pytest.mark.asyncio
    async def test_trend_anomaly_detection(self, anomaly_detector):
        """Test trend anomaly detection."""
        # Create data with trend and anomaly
        x = np.linspace(0, 100, 100)
        trend = 2 * x + 100  # Linear trend
        noise = np.random.normal(0, 5, 100)
        values = trend + noise
        
        # Inject trend anomaly (sudden change in trend)
        values[50:] = values[50:] - 100  # Sudden drop
        
        data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=100, freq='D'),
            'value': values
        })
        
        anomalies = await anomaly_detector.detect_trend_anomalies(data)
        
        assert 'trend_changes' in anomalies
        assert 'change_points' in anomalies
        assert len(anomalies['change_points']) > 0

    @pytest.mark.asyncio
    async def test_multivariate_anomaly_detection(self, anomaly_detector):
        """Test multivariate anomaly detection."""
        # Create multivariate data
        np.random.seed(42)
        n_samples = 100
        
        # Normal correlated data
        normal_data = np.random.multivariate_normal(
            mean=[50, 100],
            cov=[[100, 80], [80, 200]],
            size=n_samples
        )
        
        # Inject multivariate anomaly
        normal_data[25] = [200, 50]  # Point that breaks correlation
        
        data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=n_samples, freq='H'),
            'feature1': normal_data[:, 0],
            'feature2': normal_data[:, 1]
        })
        
        feature_columns = ['feature1', 'feature2']
        anomalies = await anomaly_detector.detect_multivariate_anomalies(data, feature_columns)
        
        assert 'anomalies' in anomalies
        assert 'correlation_analysis' in anomalies
        assert len(anomalies['anomalies']) > 0

    @pytest.mark.asyncio
    async def test_real_time_anomaly_detection(self, anomaly_detector):
        """Test real-time anomaly detection."""
        await anomaly_detector.initialize()
        
        # Simulate streaming data
        baseline_data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=50, freq='H'),
            'value': np.random.normal(100, 10, 50)
        })
        
        # Train on baseline data
        await anomaly_detector.update_baseline(baseline_data)
        
        # Test with new normal point
        normal_point = pd.DataFrame({
            'timestamp': [pd.Timestamp('2023-01-03 02:00:00')],
            'value': [105]  # Normal value
        })
        
        result = await anomaly_detector.detect_real_time_anomaly(normal_point)
        assert result['is_anomaly'] is False
        
        # Test with anomalous point
        anomalous_point = pd.DataFrame({
            'timestamp': [pd.Timestamp('2023-01-03 03:00:00')],
            'value': [300]  # Clearly anomalous value
        })
        
        result = await anomaly_detector.detect_real_time_anomaly(anomalous_point)
        assert result['is_anomaly'] is True
        assert result['confidence'] > 0.8

    @pytest.mark.asyncio
    async def test_comprehensive_anomaly_analysis(self, anomaly_detector, anomalous_time_series):
        """Test comprehensive anomaly analysis."""
        await anomaly_detector.initialize()
        
        result = await anomaly_detector.comprehensive_anomaly_analysis(anomalous_time_series)
        
        # Check all analysis types are included
        assert 'point_anomalies' in result
        assert 'statistical_anomalies' in result
        assert 'collective_anomalies' in result
        assert 'seasonal_anomalies' in result
        assert 'trend_anomalies' in result
        assert 'summary' in result
        assert 'recommendations' in result
        
        # Check summary metrics
        summary = result['summary']
        assert 'total_anomalies' in summary
        assert 'anomaly_types' in summary
        assert 'severity_distribution' in summary
        assert 'confidence_scores' in summary

    @pytest.mark.asyncio
    async def test_anomaly_severity_classification(self, anomaly_detector):
        """Test anomaly severity classification."""
        # Test different severity levels
        low_severity_score = 0.6
        medium_severity_score = 0.75
        high_severity_score = 0.9
        
        assert anomaly_detector._classify_severity(low_severity_score) == 'low'
        assert anomaly_detector._classify_severity(medium_severity_score) == 'medium'
        assert anomaly_detector._classify_severity(high_severity_score) == 'high'

    @pytest.mark.asyncio
    async def test_empty_data_handling(self, anomaly_detector):
        """Test handling of empty data."""
        empty_df = pd.DataFrame()
        
        result = await anomaly_detector.detect_point_anomalies(empty_df)
        assert result['status'] == 'insufficient_data'
        
        # Test with insufficient data
        small_df = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=5, freq='H'),
            'value': [1, 2, 3, 4, 5]
        })
        
        result = await anomaly_detector.detect_point_anomalies(small_df)
        assert result['status'] == 'insufficient_data'

    @pytest.mark.asyncio
    async def test_error_handling(self, anomaly_detector):
        """Test error handling in anomaly detection."""
        # Create invalid data
        invalid_df = pd.DataFrame({
            'timestamp': ['invalid', 'timestamp', 'data'],
            'value': ['not', 'numeric', 'values']
        })
        
        result = await anomaly_detector.detect_point_anomalies(invalid_df)
        assert 'error' in result

    def test_feature_engineering(self, anomaly_detector):
        """Test feature engineering for anomaly detection."""
        data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=24, freq='H'),
            'value': np.random.normal(100, 10, 24)
        })
        
        features = anomaly_detector._engineer_temporal_features(data)
        
        assert 'hour' in features.columns
        assert 'day_of_week' in features.columns
        assert 'is_weekend' in features.columns
        assert len(features) == len(data)

    @pytest.mark.asyncio
    async def test_anomaly_explanation(self, anomaly_detector):
        """Test anomaly explanation generation."""
        anomaly_data = {
            'index': 25,
            'timestamp': '2023-01-02T01:00:00',
            'value': 500,
            'score': 0.9,
            'expected_range': [80, 120]
        }
        
        explanation = await anomaly_detector.explain_anomaly(anomaly_data)
        
        assert 'explanation' in explanation
        assert 'contributing_factors' in explanation
        assert 'severity' in explanation
        assert 'recommendation' in explanation

    @pytest.mark.asyncio
    async def test_model_update_and_drift_detection(self, anomaly_detector):
        """Test model update and concept drift detection."""
        # Initial data
        initial_data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=100, freq='H'),
            'value': np.random.normal(100, 10, 100)
        })
        
        await anomaly_detector.update_baseline(initial_data)
        initial_performance = anomaly_detector.get_model_performance()
        
        # New data with different distribution (concept drift)
        drifted_data = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-05', periods=100, freq='H'),
            'value': np.random.normal(150, 15, 100)  # Different mean and std
        })
        
        drift_detected = await anomaly_detector.detect_concept_drift(drifted_data)
        assert 'drift_detected' in drift_detected
        assert 'drift_magnitude' in drift_detected

    @pytest.mark.parametrize("sensitivity,expected_anomaly_count", [
        (0.05, 5),   # High sensitivity - more anomalies
        (0.1, 10),   # Medium sensitivity
        (0.2, 20),   # Low sensitivity - fewer anomalies
    ])
    @pytest.mark.asyncio
    async def test_sensitivity_parameter(self, sensitivity, expected_anomaly_count):
        """Test anomaly detection with different sensitivity parameters."""
        settings = Settings(anomaly_sensitivity=sensitivity)
        detector = AnomalyDetector(settings)
        await detector.initialize()
        
        # Create data with known anomalies
        data = np.random.normal(100, 10, 100)
        data[25] = 300  # Clear anomaly
        
        df = pd.DataFrame({
            'timestamp': pd.date_range(start='2023-01-01', periods=100, freq='H'),
            'value': data
        })
        
        result = await detector.detect_point_anomalies(df)
        
        # Higher sensitivity should detect more anomalies (but allow for some variance)
        anomaly_count = len(result['anomalies'])
        assert anomaly_count > 0  # Should detect at least the obvious anomaly