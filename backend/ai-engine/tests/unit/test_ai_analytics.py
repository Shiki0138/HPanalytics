import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import json

from services.ai_analytics import AIAnalyticsService
from models.schemas import AnalyticsRequest
from config.settings import Settings


@pytest.fixture
def ai_service():
    """AI Analytics Service fixture."""
    settings = Settings(
        openai_api_key="test-key",
        redis_url="redis://localhost:6379/1",
        openai_model="gpt-3.5-turbo",
        openai_temperature=0.7,
        openai_max_tokens=2000,
        anomaly_sensitivity=0.1,
        main_backend_url="http://localhost:3000",
        analytics_api_timeout=30
    )
    return AIAnalyticsService(settings)


@pytest.fixture
def sample_dataframe():
    """Sample DataFrame for testing."""
    dates = pd.date_range(start='2023-01-01', end='2023-01-30', freq='D')
    np.random.seed(42)
    
    return pd.DataFrame({
        'date': dates,
        'page_views': np.random.poisson(1000, len(dates)),
        'unique_visitors': np.random.poisson(400, len(dates)),
        'sessions': np.random.poisson(600, len(dates)),
        'bounce_rate': np.random.beta(2, 3, len(dates)),
        'avg_session_duration': np.random.gamma(2, 60, len(dates)),
        'conversions': np.random.poisson(20, len(dates)),
        'revenue': np.random.gamma(2, 500, len(dates))
    })


class TestAIAnalyticsService:
    """Test AI Analytics Service."""

    @pytest.mark.asyncio
    async def test_initialization(self, ai_service, mock_redis, mock_openai):
        """Test service initialization."""
        with patch('services.ai_analytics.openai') as mock_openai_module, \
             patch('services.ai_analytics.redis.from_url') as mock_redis_from_url:
            
            mock_openai_module.AsyncOpenAI.return_value = mock_openai
            mock_redis_from_url.return_value = mock_redis
            
            await ai_service.initialize()
            
            assert ai_service.openai_client is not None
            assert ai_service.langchain_llm is not None
            assert ai_service.redis_client is not None
            assert ai_service.memory is not None
            assert len(ai_service.analysis_prompts) > 0
            assert 'anomaly_detector' in ai_service.model_cache

    @pytest.mark.asyncio
    async def test_performance_analysis(self, ai_service, sample_dataframe):
        """Test performance analysis."""
        result = await ai_service._performance_analysis(sample_dataframe)
        
        assert 'key_metrics' in result
        assert 'performance_score' in result
        assert 'benchmarks' in result
        assert 'alerts' in result
        
        # Check key metrics
        metrics = result['key_metrics']
        assert 'page_views' in metrics
        assert 'unique_visitors' in metrics
        assert 'bounce_rate' in metrics
        assert 'conversion_rate' in metrics
        
        # Check performance score is a valid number
        assert isinstance(result['performance_score'], (int, float))
        assert 0 <= result['performance_score'] <= 100

    @pytest.mark.asyncio
    async def test_performance_analysis_empty_data(self, ai_service):
        """Test performance analysis with empty DataFrame."""
        empty_df = pd.DataFrame()
        result = await ai_service._performance_analysis(empty_df)
        
        assert result['status'] == 'no_data'

    @pytest.mark.asyncio
    async def test_engagement_analysis(self, ai_service, sample_dataframe):
        """Test engagement analysis."""
        # Add engagement-specific columns
        sample_dataframe['pages_per_session'] = np.random.gamma(2, 2, len(sample_dataframe))
        sample_dataframe['time_on_page'] = np.random.gamma(2, 30, len(sample_dataframe))
        sample_dataframe['return_visitors'] = np.random.poisson(100, len(sample_dataframe))
        sample_dataframe['total_visitors'] = sample_dataframe['unique_visitors']
        
        result = await ai_service._engagement_analysis(sample_dataframe)
        
        assert 'engagement_metrics' in result
        assert 'engagement_segments' in result
        assert 'content_performance' in result
        assert 'engagement_trends' in result
        assert 'optimization_opportunities' in result
        
        # Check engagement metrics
        metrics = result['engagement_metrics']
        assert 'avg_pages_per_session' in metrics
        assert 'avg_time_on_page' in metrics
        assert 'return_visitor_rate' in metrics

    @pytest.mark.asyncio
    async def test_conversion_analysis(self, ai_service, sample_dataframe):
        """Test conversion analysis."""
        result = await ai_service._conversion_analysis(sample_dataframe)
        
        assert 'funnel_analysis' in result
        assert 'attribution_analysis' in result
        assert 'optimization_opportunities' in result
        assert 'conversion_trends' in result
        assert 'segment_performance' in result

    @pytest.mark.asyncio
    async def test_statistical_analysis(self, ai_service, sample_dataframe):
        """Test statistical analysis methods."""
        result = ai_service._perform_statistical_analysis(sample_dataframe)
        
        # Should have insights for numeric columns
        assert 'page_views' in result
        assert 'unique_visitors' in result
        
        # Check statistical measures
        page_views_stats = result['page_views']
        assert 'mean' in page_views_stats
        assert 'median' in page_views_stats
        assert 'std' in page_views_stats
        assert 'trend' in page_views_stats
        assert 'seasonality' in page_views_stats

    def test_trend_calculation(self, ai_service):
        """Test trend calculation."""
        # Test increasing trend
        increasing_series = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        trend = ai_service._calculate_trend(increasing_series)
        
        assert trend['direction'] == 'increasing'
        assert trend['slope'] > 0
        assert trend['r_squared'] > 0.9  # Should be very linear
        
        # Test decreasing trend
        decreasing_series = pd.Series([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
        trend = ai_service._calculate_trend(decreasing_series)
        
        assert trend['direction'] == 'decreasing'
        assert trend['slope'] < 0

    def test_outlier_detection(self, ai_service):
        """Test outlier detection."""
        # Create series with clear outliers
        normal_data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        outlier_data = normal_data + [100, 200]  # Clear outliers
        series = pd.Series(outlier_data)
        
        outliers = ai_service._detect_outliers(series)
        
        # Should detect the outliers (indices 10 and 11)
        assert len(outliers) >= 2
        assert 10 in outliers
        assert 11 in outliers

    def test_seasonality_detection(self, ai_service):
        """Test seasonality detection."""
        # Create weekly pattern
        weekly_pattern = [100, 80, 70, 75, 85, 90, 95] * 4  # 4 weeks
        series = pd.Series(weekly_pattern)
        
        seasonality = ai_service._detect_seasonality(series)
        
        # Should detect some correlation
        assert 'detected' in seasonality
        assert 'weekly_correlation' in seasonality

    def test_performance_score_calculation(self, ai_service):
        """Test performance score calculation."""
        # Good performance metrics
        good_metrics = {
            'bounce_rate': 0.40,  # Low bounce rate is good
            'conversion_rate': 0.05,  # High conversion rate is good
            'avg_session_duration': 240  # Long session duration is good
        }
        
        score = ai_service._calculate_performance_score(good_metrics)
        assert score >= 70  # Should be a good score
        
        # Poor performance metrics
        poor_metrics = {
            'bounce_rate': 0.80,  # High bounce rate is bad
            'conversion_rate': 0.01,  # Low conversion rate is bad
            'avg_session_duration': 30  # Short session duration is bad
        }
        
        score = ai_service._calculate_performance_score(poor_metrics)
        assert score <= 50  # Should be a poor score

    def test_confidence_score_calculation(self, ai_service):
        """Test confidence score calculation."""
        # High confidence data
        high_confidence_data = {
            'metadata': {'data_points': 2000},
            'performance': {'statistical_insights': {'significance_level': 0.01}},
            'engagement': {'result': 'success'},
            'conversion': {'result': 'success'}
        }
        
        score = ai_service._calculate_confidence_score(high_confidence_data)
        assert score >= 0.8  # Should be high confidence
        
        # Low confidence data
        low_confidence_data = {
            'metadata': {'data_points': 50},
            'performance': {'error': 'failed'},
            'engagement': {'error': 'failed'}
        }
        
        score = ai_service._calculate_confidence_score(low_confidence_data)
        assert score <= 0.8  # Should be lower confidence

    def test_performance_alerts(self, ai_service):
        """Test performance alert identification."""
        # High bounce rate should trigger alert
        high_bounce_metrics = {'bounce_rate': 0.75, 'conversion_rate': 0.03}
        alerts = ai_service._identify_performance_alerts(high_bounce_metrics)
        
        assert len(alerts) > 0
        assert any(alert['type'] == 'high_bounce_rate' for alert in alerts)
        
        # Low conversion rate should trigger alert
        low_conversion_metrics = {'bounce_rate': 0.50, 'conversion_rate': 0.005}
        alerts = ai_service._identify_performance_alerts(low_conversion_metrics)
        
        assert len(alerts) > 0
        assert any(alert['type'] == 'low_conversion_rate' for alert in alerts)

    def test_sample_data_generation(self, ai_service):
        """Test sample data generation."""
        date_range = {
            'start': datetime(2023, 1, 1),
            'end': datetime(2023, 1, 31)
        }
        
        df = ai_service._generate_sample_data('test-site', date_range)
        
        assert not df.empty
        assert len(df) == 30  # 30 days
        assert 'page_views' in df.columns
        assert 'unique_visitors' in df.columns
        assert 'bounce_rate' in df.columns
        
        # Check data ranges are reasonable
        assert df['page_views'].min() > 0
        assert df['bounce_rate'].max() <= 1.0
        assert df['bounce_rate'].min() >= 0.0

    @pytest.mark.asyncio
    async def test_cache_operations(self, ai_service, mock_redis):
        """Test cache operations."""
        # Setup mock
        ai_service.redis_client = mock_redis
        
        # Test save to cache
        await ai_service._save_to_cache('test_key', 'test_value', 3600)
        mock_redis.setex.assert_called_once_with('test_key', 3600, 'test_value')
        
        # Test get from cache
        mock_redis.get.return_value = 'cached_value'
        result = await ai_service._get_from_cache('test_key')
        assert result == 'cached_value'

    def test_text_extraction_methods(self, ai_service):
        """Test text extraction helper methods."""
        sample_text = """
        分析結果です。
        推奨事項: ランディングページを改善してください
        ROIは15%向上が期待されます
        次のステップ: A/Bテストを実施してください
        アクション: コンテンツを最適化してください
        """
        
        # Test recommendations extraction
        recommendations = ai_service._extract_recommendations(sample_text)
        assert len(recommendations) > 0
        assert any('推奨事項' in rec for rec in recommendations)
        
        # Test ROI predictions extraction
        roi_predictions = ai_service._extract_roi_predictions(sample_text)
        assert 'predicted_roi' in roi_predictions
        assert roi_predictions['predicted_roi'] == 0.15
        
        # Test next steps extraction
        next_steps = ai_service._extract_next_steps(sample_text)
        assert len(next_steps) > 0

    @pytest.mark.asyncio
    async def test_comprehensive_analysis_request(self, ai_service, mock_redis, mock_openai):
        """Test comprehensive analysis with mocked dependencies."""
        # Setup mocks
        ai_service.redis_client = mock_redis
        ai_service.openai_client = mock_openai
        
        # Mock LangChain LLM
        mock_llm = AsyncMock()
        mock_llm.arun = AsyncMock(return_value='{"insights": "test insights", "recommendations": []}')
        ai_service.langchain_llm = mock_llm
        
        # Mock the LLM chain
        with patch('services.ai_analytics.LLMChain') as mock_chain_class:
            mock_chain = AsyncMock()
            mock_chain.arun = AsyncMock(return_value='{"insights": "test insights", "recommendations": []}')
            mock_chain_class.return_value = mock_chain
            
            # Mock fetch analytics data to return sample data
            with patch.object(ai_service, '_fetch_analytics_data') as mock_fetch:
                mock_fetch.return_value = ai_service._generate_sample_data(
                    'test-site',
                    {'start': datetime(2023, 1, 1), 'end': datetime(2023, 1, 31)}
                )
                
                # Create request
                request = AnalyticsRequest(
                    site_id='test-site',
                    date_range={
                        'start': datetime(2023, 1, 1),
                        'end': datetime(2023, 1, 31)
                    }
                )
                
                # Execute analysis
                result = await ai_service.comprehensive_analysis(request)
                
                # Verify result structure
                assert 'analysis_results' in result
                assert 'ai_insights' in result
                assert 'processing_time_ms' in result
                assert 'confidence_score' in result
                assert 'recommendations' in result
                assert 'roi_predictions' in result
                
                # Verify processing time is reasonable
                assert result['processing_time_ms'] > 0
                assert result['processing_time_ms'] < 60000  # Less than 60 seconds
                
                # Verify confidence score is valid
                assert 0 <= result['confidence_score'] <= 1

    @pytest.mark.asyncio
    async def test_health_check_success(self, ai_service, mock_redis, mock_openai):
        """Test successful health check."""
        ai_service.redis_client = mock_redis
        ai_service.openai_client = mock_openai
        
        # Mock successful responses
        mock_openai.chat.completions.create.return_value = MagicMock()
        mock_redis.ping.return_value = True
        
        result = await ai_service.health_check()
        assert result is True

    @pytest.mark.asyncio
    async def test_health_check_failure(self, ai_service, mock_redis, mock_openai):
        """Test health check with failures."""
        ai_service.redis_client = mock_redis
        ai_service.openai_client = mock_openai
        
        # Mock failure
        mock_openai.chat.completions.create.side_effect = Exception("API Error")
        
        result = await ai_service.health_check()
        assert result is False

    def test_error_handling_in_performance_analysis(self, ai_service):
        """Test error handling in performance analysis."""
        # Create problematic DataFrame
        problematic_df = pd.DataFrame({'invalid_column': ['text', 'data', 'here']})
        
        # Should not raise exception, but return error info
        result = ai_service._perform_statistical_analysis(problematic_df)
        
        # Should handle gracefully
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_fetch_analytics_data_with_cache(self, ai_service, mock_redis):
        """Test fetching analytics data with cache hit."""
        ai_service.redis_client = mock_redis
        
        # Mock cache hit
        cached_data = pd.DataFrame({'test': [1, 2, 3]}).to_json()
        mock_redis.get.return_value = cached_data
        
        result = await ai_service._fetch_analytics_data(
            'test-site',
            {'start': datetime(2023, 1, 1), 'end': datetime(2023, 1, 31)}
        )
        
        assert not result.empty
        assert 'test' in result.columns

    @pytest.mark.parametric
    @pytest.mark.parametrize("data_points,expected_min_confidence", [
        (2000, 0.85),  # High data points should give high confidence
        (500, 0.75),   # Medium data points should give medium confidence  
        (50, 0.65),    # Low data points should give lower confidence
    ])
    def test_confidence_score_by_data_points(self, ai_service, data_points, expected_min_confidence):
        """Test confidence score calculation based on data points."""
        data = {
            'metadata': {'data_points': data_points},
            'performance': {'statistical_insights': {'significance_level': 0.01}},
            'engagement': {'result': 'success'},
            'conversion': {'result': 'success'}
        }
        
        confidence = ai_service._calculate_confidence_score(data)
        assert confidence >= expected_min_confidence