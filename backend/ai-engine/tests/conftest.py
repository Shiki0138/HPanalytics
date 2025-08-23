import pytest
import asyncio
import os
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Set test environment before importing app
os.environ.setdefault('ENVIRONMENT', 'test')
os.environ.setdefault('DATABASE_URL', 'sqlite:///./test.db')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/1')
os.environ.setdefault('OPENAI_API_KEY', 'test-key')

from main import app
from config.settings import get_settings


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    
    yield loop
    loop.close()


@pytest.fixture
def test_settings():
    """Override settings for testing."""
    settings = get_settings()
    settings.database_url = "sqlite:///./test.db"
    settings.redis_url = "redis://localhost:6379/1"
    settings.openai_api_key = "test-key"
    settings.environment = "test"
    return settings


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Create a test client for synchronous tests."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client for asynchronous tests."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=None)
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.setex = AsyncMock(return_value=True)
    redis_mock.delete = AsyncMock(return_value=1)
    redis_mock.exists = AsyncMock(return_value=False)
    redis_mock.expire = AsyncMock(return_value=True)
    redis_mock.publish = AsyncMock(return_value=1)
    return redis_mock


@pytest.fixture
def mock_openai():
    """Mock OpenAI client."""
    openai_mock = MagicMock()
    openai_mock.chat.completions.create = AsyncMock()
    openai_mock.embeddings.create = AsyncMock()
    return openai_mock


@pytest.fixture
def sample_analytics_data():
    """Sample analytics data for testing."""
    return {
        "site_id": "test-site-123",
        "page_views": [
            {"timestamp": "2023-01-01T10:00:00Z", "count": 100},
            {"timestamp": "2023-01-01T11:00:00Z", "count": 150},
            {"timestamp": "2023-01-01T12:00:00Z", "count": 200},
        ],
        "user_sessions": [
            {
                "session_id": "session-1",
                "user_id": "user-1",
                "duration": 120,
                "pages_visited": 3,
                "timestamp": "2023-01-01T10:00:00Z"
            },
            {
                "session_id": "session-2", 
                "user_id": "user-2",
                "duration": 300,
                "pages_visited": 5,
                "timestamp": "2023-01-01T10:30:00Z"
            }
        ],
        "events": [
            {
                "event_type": "click",
                "element": "button",
                "page_url": "/landing",
                "timestamp": "2023-01-01T10:15:00Z"
            },
            {
                "event_type": "scroll",
                "scroll_depth": 75,
                "page_url": "/landing", 
                "timestamp": "2023-01-01T10:16:00Z"
            }
        ]
    }


@pytest.fixture
def sample_user_behavior():
    """Sample user behavior data for testing."""
    return {
        "user_id": "test-user-123",
        "sessions": [
            {
                "session_id": "session-1",
                "start_time": "2023-01-01T10:00:00Z",
                "end_time": "2023-01-01T10:15:00Z",
                "pages": ["/home", "/products", "/cart"],
                "events": [
                    {"type": "click", "element": "nav-link", "timestamp": "2023-01-01T10:02:00Z"},
                    {"type": "click", "element": "product-card", "timestamp": "2023-01-01T10:05:00Z"},
                    {"type": "click", "element": "add-to-cart", "timestamp": "2023-01-01T10:08:00Z"}
                ]
            }
        ],
        "total_sessions": 5,
        "total_page_views": 25,
        "avg_session_duration": 180,
        "bounce_rate": 0.2
    }


@pytest.fixture
def mock_websocket_manager():
    """Mock WebSocket manager."""
    manager_mock = MagicMock()
    manager_mock.connect = AsyncMock()
    manager_mock.disconnect = AsyncMock()
    manager_mock.send_personal_message = AsyncMock()
    manager_mock.broadcast = AsyncMock()
    manager_mock.active_connections = []
    return manager_mock


@pytest.fixture
def sample_anomaly_data():
    """Sample data for anomaly detection testing."""
    import numpy as np
    
    # Generate normal data with some anomalies
    normal_data = np.random.normal(100, 10, 100).tolist()
    anomalies = [200, 300, 50, 10]  # Clear anomalies
    
    data = normal_data + anomalies
    timestamps = [f"2023-01-{i:02d}T10:00:00Z" for i in range(1, len(data) + 1)]
    
    return {
        "values": data,
        "timestamps": timestamps,
        "expected_anomalies": len(anomalies)
    }


@pytest.fixture
def mock_database():
    """Mock database operations."""
    db_mock = AsyncMock()
    db_mock.execute = AsyncMock()
    db_mock.fetch = AsyncMock(return_value=[])
    db_mock.fetchone = AsyncMock(return_value=None)
    db_mock.fetchval = AsyncMock(return_value=None)
    return db_mock


# Test data factories using factory_boy
import factory
from datetime import datetime, timezone


class AnalyticsDataFactory(factory.Factory):
    class Meta:
        model = dict
    
    site_id = factory.Faker('uuid4')
    timestamp = factory.LazyFunction(lambda: datetime.now(timezone.utc).isoformat())
    page_views = factory.Faker('random_int', min=1, max=1000)
    unique_visitors = factory.Faker('random_int', min=1, max=500)
    bounce_rate = factory.Faker('pyfloat', left_digits=1, right_digits=2, positive=True, max_value=1)
    avg_session_duration = factory.Faker('random_int', min=30, max=3600)


class UserSessionFactory(factory.Factory):
    class Meta:
        model = dict
    
    session_id = factory.Faker('uuid4')
    user_id = factory.Faker('uuid4')
    site_id = factory.Faker('uuid4')
    start_time = factory.Faker('date_time')
    end_time = factory.Faker('date_time')
    page_views = factory.Faker('random_int', min=1, max=20)
    events = factory.List([
        factory.Dict({
            'type': factory.Faker('word'),
            'timestamp': factory.Faker('date_time'),
            'data': factory.Dict({'element': factory.Faker('word')})
        })
        for _ in range(3)
    ])


class AIInsightFactory(factory.Factory):
    class Meta:
        model = dict
    
    insight_id = factory.Faker('uuid4')
    site_id = factory.Faker('uuid4')
    type = factory.Faker('word', ext_word_list=['trend', 'anomaly', 'recommendation'])
    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('text', max_nb_chars=200)
    confidence = factory.Faker('pyfloat', left_digits=1, right_digits=2, positive=True, max_value=1)
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc).isoformat())
    metadata = factory.Dict({
        'source': factory.Faker('word'),
        'category': factory.Faker('word')
    })