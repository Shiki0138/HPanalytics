# Implementation Guide
## AI Revenue Optimization Engine - Developer Documentation

### Development Setup & Environment

#### Prerequisites
```bash
# Required software versions
Node.js >= 18.0.0
Python >= 3.9.0
PostgreSQL >= 14.0
Redis >= 6.2.0
Docker >= 20.10.0
Kubernetes >= 1.24.0 (for production)

# Development tools
Git >= 2.30.0
VS Code with extensions:
  - TypeScript Hero
  - Python Extension Pack
  - Docker Extension
  - Kubernetes Extension
```

#### Environment Setup
```bash
# 1. Clone and setup frontend
cd /Users/leadfive/Desktop/system/038_HP分析システム/frontend
npm install
npm run dev # Verify existing system works

# 2. Setup Python ML services
mkdir -p ml-services
cd ml-services
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Setup databases
# PostgreSQL (operational data)
createdb ai_revenue_optimization
psql ai_revenue_optimization < schema/postgresql_schema.sql

# ClickHouse (analytics data)
clickhouse-client --query "CREATE DATABASE analytics"
clickhouse-client --database analytics < schema/clickhouse_schema.sql

# 4. Setup Redis
redis-server --daemonize yes

# 5. Setup message queue (Kafka - optional for development)
docker run -d --name kafka -p 9092:9092 confluentinc/cp-kafka:latest
```

---

## Phase 1 Implementation Details

### 1.1 Real-Time Purchase Prediction System

#### ML Model Implementation
```python
# ml-services/models/purchase_prediction.py
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score
import joblib
import logging
from typing import Dict, List, Tuple

class PurchasePredictionModel:
    def __init__(self):
        self.model = None
        self.feature_columns = [
            'session_duration', 'page_views', 'products_viewed',
            'add_to_cart_count', 'time_since_last_visit', 'device_type_encoded',
            'traffic_source_encoded', 'day_of_week', 'hour_of_day',
            'customer_lifetime_value', 'previous_purchases', 'avg_order_value'
        ]
        self.target_column = 'purchased_within_session'
        
    def prepare_features(self, raw_data: pd.DataFrame) -> pd.DataFrame:
        """Feature engineering for purchase prediction"""
        features = pd.DataFrame()
        
        # Session-based features
        features['session_duration'] = raw_data['session_end'] - raw_data['session_start']
        features['page_views'] = raw_data['page_view_count']
        features['products_viewed'] = raw_data['unique_products_viewed']
        features['add_to_cart_count'] = raw_data['add_to_cart_events']
        
        # Temporal features
        features['day_of_week'] = pd.to_datetime(raw_data['timestamp']).dt.dayofweek
        features['hour_of_day'] = pd.to_datetime(raw_data['timestamp']).dt.hour
        features['time_since_last_visit'] = raw_data['time_since_last_visit_hours']
        
        # Device and source features (encoded)
        features['device_type_encoded'] = pd.Categorical(raw_data['device_type']).codes
        features['traffic_source_encoded'] = pd.Categorical(raw_data['traffic_source']).codes
        
        # Customer history features
        features['customer_lifetime_value'] = raw_data['customer_lifetime_value'].fillna(0)
        features['previous_purchases'] = raw_data['previous_purchase_count'].fillna(0)
        features['avg_order_value'] = raw_data['avg_order_value'].fillna(0)
        
        return features[self.feature_columns]
    
    def train(self, training_data: pd.DataFrame) -> Dict:
        """Train the purchase prediction model"""
        # Prepare features
        X = self.prepare_features(training_data)
        y = training_data[self.target_column]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train model
        self.model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'feature_importance': dict(zip(self.feature_columns, 
                                         self.model.feature_importances_))
        }
        
        # Save model
        joblib.dump(self.model, 'models/purchase_prediction_model.pkl')
        
        return metrics
    
    def predict(self, session_data: Dict) -> Dict:
        """Make real-time purchase prediction"""
        if self.model is None:
            self.model = joblib.load('models/purchase_prediction_model.pkl')
        
        # Convert to DataFrame for feature preparation
        df = pd.DataFrame([session_data])
        features = self.prepare_features(df)
        
        # Predict
        probability = self.model.predict_proba(features)[0, 1]
        prediction = self.model.predict(features)[0]
        
        # Get feature contributions for explainability
        feature_contributions = {}
        for i, feature in enumerate(self.feature_columns):
            feature_contributions[feature] = features.iloc[0, i] * self.model.feature_importances_[i]
        
        return {
            'purchase_probability': float(probability),
            'prediction': bool(prediction),
            'confidence': float(max(self.model.predict_proba(features)[0])),
            'feature_contributions': feature_contributions
        }
```

#### Frontend Component Implementation
```typescript
// components/revenue/PurchasePredictionCard.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material'
import { TrendingUp, Psychology, ShoppingCart, Warning } from '@mui/icons-material'
import { motion } from 'framer-motion'
import Card from '@/components/common/Card'

interface PurchasePrediction {
  purchaseProbability: number
  prediction: boolean
  confidence: number
  featureContributions: Record<string, number>
  recommendedActions?: string[]
}

interface PurchasePredictionCardProps {
  sessionId: string
  customerId?: string
  realTime?: boolean
}

const PurchasePredictionCard: React.FC<PurchasePredictionCardProps> = ({
  sessionId,
  customerId,
  realTime = true,
}) => {
  const theme = useTheme()
  const [prediction, setPrediction] = useState<PurchasePrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPrediction = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/v1/ml/purchase-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          customerId,
          includeFeatureContributions: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`)
      }

      const data = await response.json()
      setPrediction(data)
    } catch (err) {
      console.error('Purchase prediction error:', err)
      setError(err instanceof Error ? err.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrediction()
    
    // Set up real-time updates
    if (realTime) {
      const interval = setInterval(fetchPrediction, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [sessionId, customerId, realTime])

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return theme.palette.success.main
    if (probability >= 0.5) return theme.palette.warning.main
    return theme.palette.error.main
  }

  const getProbabilityLabel = (probability: number) => {
    if (probability >= 0.8) return 'Very High'
    if (probability >= 0.6) return 'High'
    if (probability >= 0.4) return 'Medium'
    if (probability >= 0.2) return 'Low'
    return 'Very Low'
  }

  return (
    <Card
      title="Purchase Prediction"
      icon={<Psychology />}
      sx={{
        background: prediction 
          ? `linear-gradient(135deg, ${alpha(getProbabilityColor(prediction.purchaseProbability), 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
          : undefined,
      }}
    >
      <Box sx={{ p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {prediction && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Main Prediction Display */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ 
                color: getProbabilityColor(prediction.purchaseProbability),
                fontWeight: 'bold',
                mb: 1 
              }}>
                {Math.round(prediction.purchaseProbability * 100)}%
              </Typography>
              
              <Chip
                label={getProbabilityLabel(prediction.purchaseProbability)}
                color={prediction.purchaseProbability >= 0.5 ? 'success' : 'warning'}
                sx={{ mb: 1 }}
              />
              
              <Typography variant="body2" color="text.secondary">
                Purchase Probability
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={prediction.purchaseProbability * 100}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha(getProbabilityColor(prediction.purchaseProbability), 0.2),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getProbabilityColor(prediction.purchaseProbability),
                    borderRadius: 4,
                  },
                }}
              />
            </Box>

            {/* Confidence Score */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Confidence:
              </Typography>
              <Chip
                size="small"
                label={`${Math.round(prediction.confidence * 100)}%`}
                color={prediction.confidence >= 0.8 ? 'success' : 'default'}
              />
            </Box>

            {/* Top Contributing Factors */}
            {prediction.featureContributions && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Key Factors:
                </Typography>
                {Object.entries(prediction.featureContributions)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                  .slice(0, 3)
                  .map(([feature, contribution]) => (
                    <Box key={feature} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                      p: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 1,
                    }}>
                      <Typography variant="body2">
                        {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Chip
                        size="small"
                        label={contribution > 0 ? '↑' : '↓'}
                        color={contribution > 0 ? 'success' : 'error'}
                        sx={{ minWidth: '40px' }}
                      />
                    </Box>
                  ))}
              </Box>
            )}

            {/* Recommended Actions */}
            {prediction.recommendedActions && prediction.recommendedActions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recommended Actions:
                </Typography>
                {prediction.recommendedActions.map((action, index) => (
                  <Alert key={index} severity="info" sx={{ mb: 1, py: 0 }}>
                    <Typography variant="body2">{action}</Typography>
                  </Alert>
                ))}
              </Box>
            )}

            {/* Real-time Indicator */}
            {realTime && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mt: 2,
                pt: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%',
                  backgroundColor: theme.palette.success.main,
                  mr: 1,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  },
                }} />
                <Typography variant="caption" color="text.secondary">
                  Live Prediction • Updates every 30s
                </Typography>
              </Box>
            )}
          </motion.div>
        )}
      </Box>
    </Card>
  )
}

export default PurchasePredictionCard
```

### 1.2 Dynamic Pricing Implementation

#### Pricing Algorithm
```python
# ml-services/models/dynamic_pricing.py
import numpy as np
import pandas as pd
from scipy.optimize import minimize
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class PricingContext:
    product_id: str
    current_price: float
    base_cost: float
    inventory_level: int
    demand_forecast: float
    competitor_prices: List[float]
    customer_segment: Optional[str] = None
    time_of_day: int = 12
    day_of_week: int = 1

class DynamicPricingEngine:
    def __init__(self):
        self.price_elasticity_models = {}
        self.demand_prediction_models = {}
        
    def calculate_price_elasticity(self, historical_data: pd.DataFrame, product_id: str) -> float:
        """Calculate price elasticity for a product"""
        product_data = historical_data[historical_data['product_id'] == product_id]
        
        if len(product_data) < 30:  # Need sufficient data
            return -1.5  # Default elasticity
        
        # Calculate elasticity using log-log regression
        log_price = np.log(product_data['price'])
        log_quantity = np.log(product_data['quantity_sold'] + 1)  # Add 1 to avoid log(0)
        
        # Simple linear regression for elasticity
        coeff = np.corrcoef(log_price, log_quantity)[0, 1]
        elasticity = coeff * (np.std(log_quantity) / np.std(log_price))
        
        return elasticity
    
    def predict_demand(self, context: PricingContext, price: float) -> float:
        """Predict demand at given price"""
        # Base demand from forecast
        base_demand = context.demand_forecast
        
        # Price elasticity effect
        elasticity = self.price_elasticity_models.get(context.product_id, -1.5)
        price_ratio = price / context.current_price
        demand_multiplier = price_ratio ** elasticity
        
        # Inventory pressure (increase demand prediction when inventory is high)
        inventory_factor = 1.0
        if context.inventory_level > 1000:
            inventory_factor = 1.1
        elif context.inventory_level < 100:
            inventory_factor = 0.9
        
        # Time-based factors
        time_factor = 1.0
        if context.time_of_day in [10, 11, 19, 20]:  # Peak hours
            time_factor = 1.15
        
        weekend_factor = 1.1 if context.day_of_week in [5, 6] else 1.0
        
        predicted_demand = (
            base_demand * 
            demand_multiplier * 
            inventory_factor * 
            time_factor * 
            weekend_factor
        )
        
        return max(0, predicted_demand)
    
    def calculate_profit(self, context: PricingContext, price: float) -> float:
        """Calculate expected profit at given price"""
        demand = self.predict_demand(context, price)
        revenue = price * demand
        cost = context.base_cost * demand
        profit = revenue - cost
        
        return profit
    
    def optimize_price(self, context: PricingContext) -> Dict:
        """Find optimal price using profit maximization"""
        # Define price bounds
        min_price = context.base_cost * 1.1  # Minimum 10% markup
        max_price = context.current_price * 2.0  # Maximum 2x current price
        
        # Consider competitor prices
        if context.competitor_prices:
            avg_competitor_price = np.mean(context.competitor_prices)
            min_competitor_price = min(context.competitor_prices)
            max_competitor_price = max(context.competitor_prices)
            
            # Adjust bounds based on competition
            min_price = max(min_price, min_competitor_price * 0.9)
            max_price = min(max_price, max_competitor_price * 1.1)
        
        # Optimization objective (negative profit for minimization)
        def objective(price):
            return -self.calculate_profit(context, price[0])
        
        # Optimize
        result = minimize(
            objective,
            x0=[context.current_price],
            bounds=[(min_price, max_price)],
            method='L-BFGS-B'
        )
        
        optimal_price = result.x[0]
        max_profit = -result.fun
        
        # Calculate metrics
        current_profit = self.calculate_profit(context, context.current_price)
        profit_lift = ((max_profit - current_profit) / current_profit) * 100 if current_profit > 0 else 0
        
        demand_at_optimal = self.predict_demand(context, optimal_price)
        demand_at_current = self.predict_demand(context, context.current_price)
        demand_change = ((demand_at_optimal - demand_at_current) / demand_at_current) * 100 if demand_at_current > 0 else 0
        
        return {
            'recommended_price': optimal_price,
            'current_price': context.current_price,
            'price_change': ((optimal_price - context.current_price) / context.current_price) * 100,
            'expected_profit': max_profit,
            'current_profit': current_profit,
            'profit_lift': profit_lift,
            'expected_demand': demand_at_optimal,
            'demand_change': demand_change,
            'confidence': min(1.0, max(0.6, 1 - abs(profit_lift) / 100)),  # Lower confidence for large changes
            'reasoning': self._generate_pricing_reasoning(context, optimal_price, profit_lift, demand_change)
        }
    
    def _generate_pricing_reasoning(self, context: PricingContext, optimal_price: float, 
                                  profit_lift: float, demand_change: float) -> str:
        """Generate human-readable reasoning for price recommendation"""
        reasons = []
        
        if optimal_price > context.current_price:
            if profit_lift > 10:
                reasons.append("Significant profit opportunity identified")
            if demand_change > -5:
                reasons.append("Demand expected to remain stable")
            if context.inventory_level > 1000:
                reasons.append("High inventory allows for premium pricing")
        else:
            if demand_change > 10:
                reasons.append("Lower price expected to drive significant demand increase")
            if context.inventory_level < 100:
                reasons.append("Low inventory suggests clearing pricing")
        
        if context.competitor_prices:
            avg_competitor = np.mean(context.competitor_prices)
            if optimal_price < avg_competitor:
                reasons.append("Competitive pricing advantage")
            elif optimal_price > avg_competitor:
                reasons.append("Premium positioning vs competitors")
        
        return "; ".join(reasons) if reasons else "Optimization based on demand elasticity and profit maximization"
```

### 1.3 Database Integration and API Layer

#### FastAPI Service Implementation
```python
# ml-services/app/main.py
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import asyncio
import asyncpg
import redis
import json
from datetime import datetime, timedelta

from models.purchase_prediction import PurchasePredictionModel
from models.dynamic_pricing import DynamicPricingEngine, PricingContext

app = FastAPI(title="AI Revenue Optimization API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
purchase_model = PurchasePredictionModel()
pricing_engine = DynamicPricingEngine()
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Database connection
async def get_db_connection():
    return await asyncpg.connect(
        "postgresql://user:password@localhost/ai_revenue_optimization"
    )

# Request models
class PurchasePredictionRequest(BaseModel):
    sessionId: str
    customerId: Optional[str] = None
    behaviorData: Dict
    contextData: Dict
    includeFeatureContributions: bool = True

class DynamicPricingRequest(BaseModel):
    productId: str
    customerId: Optional[str] = None
    contextData: Dict
    includeProfitAnalysis: bool = True

class CustomerValueRequest(BaseModel):
    customerId: str
    includeHistory: bool = False
    predictionHorizon: int = 90

# Purchase Prediction Endpoint
@app.post("/api/v1/ml/purchase-prediction")
async def predict_purchase(request: PurchasePredictionRequest):
    try:
        # Check cache first
        cache_key = f"purchase_pred:{request.sessionId}"
        cached_result = redis_client.get(cache_key)
        
        if cached_result:
            return json.loads(cached_result)
        
        # Prepare input data
        session_data = {
            'session_duration': request.behaviorData.get('timeOnSite', 0),
            'page_views': request.behaviorData.get('pageViews', 0),
            'products_viewed': request.behaviorData.get('productsViewed', 0),
            'add_to_cart_count': request.behaviorData.get('addToCartCount', 0),
            'device_type': request.contextData.get('deviceType', 'desktop'),
            'traffic_source': request.behaviorData.get('referrer', 'direct'),
            'time_since_last_visit': request.behaviorData.get('timeSinceLastVisit', 0),
            'day_of_week': datetime.now().weekday(),
            'hour_of_day': datetime.now().hour,
            'customer_lifetime_value': 0,  # Will be populated from DB if customerId provided
            'previous_purchases': 0,
            'avg_order_value': 0,
        }
        
        # Enrich with customer data if available
        if request.customerId:
            conn = await get_db_connection()
            customer_data = await conn.fetchrow(
                "SELECT lifetime_value, previous_purchase_count, avg_order_value FROM customers WHERE id = $1",
                request.customerId
            )
            await conn.close()
            
            if customer_data:
                session_data.update({
                    'customer_lifetime_value': customer_data['lifetime_value'] or 0,
                    'previous_purchases': customer_data['previous_purchase_count'] or 0,
                    'avg_order_value': customer_data['avg_order_value'] or 0,
                })
        
        # Make prediction
        prediction = purchase_model.predict(session_data)
        
        # Add recommended actions
        recommended_actions = []
        if prediction['purchase_probability'] >= 0.8:
            recommended_actions.append("Show premium products or upsells")
            recommended_actions.append("Offer expedited shipping")
        elif prediction['purchase_probability'] >= 0.5:
            recommended_actions.append("Display customer reviews and testimonials")
            recommended_actions.append("Offer limited-time discount")
        else:
            recommended_actions.append("Capture email for remarketing")
            recommended_actions.append("Show social proof and guarantees")
        
        result = {
            **prediction,
            'sessionId': request.sessionId,
            'customerId': request.customerId,
            'recommendedActions': recommended_actions,
            'timestamp': datetime.utcnow().isoformat(),
            'modelVersion': 'v1.0.0'
        }
        
        # Cache result for 5 minutes
        redis_client.setex(cache_key, 300, json.dumps(result, default=str))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Dynamic Pricing Endpoint
@app.post("/api/v1/ml/dynamic-pricing")
async def optimize_pricing(request: DynamicPricingRequest):
    try:
        # Get product data from database
        conn = await get_db_connection()
        product_data = await conn.fetchrow(
            "SELECT sku, name, base_price, current_price, cost, inventory_count FROM products WHERE id = $1",
            request.productId
        )
        await conn.close()
        
        if not product_data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Get competitor pricing (mock data for now)
        competitor_prices = request.contextData.get('competitorPrices', [])
        
        # Create pricing context
        context = PricingContext(
            product_id=request.productId,
            current_price=product_data['current_price'],
            base_cost=product_data['cost'],
            inventory_level=product_data['inventory_count'],
            demand_forecast=request.contextData.get('currentDemand', 100),
            competitor_prices=competitor_prices,
            customer_segment=request.contextData.get('customerSegment'),
            time_of_day=datetime.now().hour,
            day_of_week=datetime.now().weekday()
        )
        
        # Optimize pricing
        optimization_result = pricing_engine.optimize_price(context)
        
        result = {
            'productId': request.productId,
            'productName': product_data['name'],
            'currentPrice': context.current_price,
            'recommendedPrice': optimization_result['recommended_price'],
            'priceChangePercent': optimization_result['price_change'],
            'expectedImpact': {
                'profitLift': optimization_result['profit_lift'],
                'demandChange': optimization_result['demand_change'],
                'expectedProfit': optimization_result['expected_profit']
            },
            'confidence': optimization_result['confidence'],
            'reasoning': optimization_result['reasoning'],
            'validUntil': (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### 1.4 Frontend API Integration

#### Redux Store Updates
```typescript
// lib/redux/services/mlApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface PurchasePrediction {
  sessionId: string
  customerId?: string
  purchaseProbability: number
  prediction: boolean
  confidence: number
  featureContributions: Record<string, number>
  recommendedActions: string[]
  timestamp: string
  modelVersion: string
}

export interface PricingOptimization {
  productId: string
  productName: string
  currentPrice: number
  recommendedPrice: number
  priceChangePercent: number
  expectedImpact: {
    profitLift: number
    demandChange: number
    expectedProfit: number
  }
  confidence: number
  reasoning: string
  validUntil: string
  timestamp: string
}

export const mlApi = createApi({
  reducerPath: 'mlApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/ml/',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if needed
      const token = (getState() as any).auth.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['PurchasePrediction', 'PricingOptimization', 'CustomerValue'],
  endpoints: (builder) => ({
    getPurchasePrediction: builder.mutation<PurchasePrediction, {
      sessionId: string
      customerId?: string
      behaviorData: Record<string, any>
      contextData: Record<string, any>
      includeFeatureContributions?: boolean
    }>({
      query: (body) => ({
        url: 'purchase-prediction',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PurchasePrediction'],
    }),
    
    optimizePricing: builder.mutation<PricingOptimization, {
      productId: string
      customerId?: string
      contextData: Record<string, any>
      includeProfitAnalysis?: boolean
    }>({
      query: (body) => ({
        url: 'dynamic-pricing',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PricingOptimization'],
    }),
    
    getCustomerValue: builder.query<any, {
      customerId: string
      includeHistory?: boolean
      predictionHorizon?: number
    }>({
      query: ({ customerId, includeHistory, predictionHorizon }) => ({
        url: `customer-value/${customerId}`,
        params: { includeHistory, predictionHorizon },
      }),
      providesTags: ['CustomerValue'],
    }),
  }),
})

export const {
  useGetPurchasePredictionMutation,
  useOptimizePricingMutation,
  useGetCustomerValueQuery,
} = mlApi
```

### Testing Strategy Implementation

#### Unit Tests for ML Models
```python
# ml-services/tests/test_purchase_prediction.py
import pytest
import pandas as pd
import numpy as np
from models.purchase_prediction import PurchasePredictionModel

class TestPurchasePredictionModel:
    def setup_method(self):
        self.model = PurchasePredictionModel()
        
    def test_feature_preparation(self):
        # Mock raw data
        raw_data = pd.DataFrame({
            'session_start': [0, 3600, 7200],
            'session_end': [1800, 5400, 9000],
            'page_view_count': [5, 3, 8],
            'unique_products_viewed': [2, 1, 4],
            'add_to_cart_events': [1, 0, 2],
            'timestamp': ['2023-01-01 10:00:00', '2023-01-01 14:00:00', '2023-01-02 09:00:00'],
            'time_since_last_visit_hours': [24, 48, 72],
            'device_type': ['mobile', 'desktop', 'tablet'],
            'traffic_source': ['google', 'direct', 'facebook'],
            'customer_lifetime_value': [150.0, None, 300.0],
            'previous_purchase_count': [2, 0, 5],
            'avg_order_value': [75.0, None, 60.0]
        })
        
        features = self.model.prepare_features(raw_data)
        
        assert features.shape[0] == 3
        assert all(col in features.columns for col in self.model.feature_columns)
        assert features['session_duration'].iloc[0] == 1800  # 30 minutes
        assert features['customer_lifetime_value'].iloc[1] == 0  # None filled with 0
        
    def test_prediction_output(self):
        # Mock session data
        session_data = {
            'session_duration': 1800,
            'page_views': 5,
            'products_viewed': 2,
            'add_to_cart_count': 1,
            'device_type': 'mobile',
            'traffic_source': 'google',
            'time_since_last_visit': 24,
            'day_of_week': 1,
            'hour_of_day': 14,
            'customer_lifetime_value': 150.0,
            'previous_purchases': 2,
            'avg_order_value': 75.0,
        }
        
        # Mock model for testing
        self.model.model = MockModel()
        
        result = self.model.predict(session_data)
        
        assert 'purchase_probability' in result
        assert 'prediction' in result
        assert 'confidence' in result
        assert 'feature_contributions' in result
        assert 0 <= result['purchase_probability'] <= 1
        assert isinstance(result['prediction'], bool)
        assert 0 <= result['confidence'] <= 1

class MockModel:
    def __init__(self):
        self.feature_importances_ = np.random.random(12)
    
    def predict_proba(self, X):
        return np.array([[0.3, 0.7]])  # Mock probability
    
    def predict(self, X):
        return np.array([1])  # Mock prediction
```

#### Integration Tests for APIs
```typescript
// __tests__/api/ml.test.ts
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/ml/purchase-prediction/route'

describe('/api/v1/ml/purchase-prediction', () => {
  it('should return purchase prediction', async () => {
    const requestBody = {
      sessionId: 'test-session-123',
      customerId: 'customer-456',
      behaviorData: {
        timeOnSite: 1800,
        pageViews: 5,
        productsViewed: 2,
        addToCartCount: 1,
      },
      contextData: {
        deviceType: 'mobile',
        referrer: 'google.com',
      },
      includeFeatureContributions: true,
    }

    const request = new NextRequest('http://localhost:3000/api/v1/ml/purchase-prediction', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('purchaseProbability')
    expect(data).toHaveProperty('prediction')
    expect(data).toHaveProperty('confidence')
    expect(data).toHaveProperty('recommendedActions')
    expect(typeof data.purchaseProbability).toBe('number')
    expect(data.purchaseProbability).toBeGreaterThanOrEqual(0)
    expect(data.purchaseProbability).toBeLessThanOrEqual(1)
  })

  it('should handle missing customer data gracefully', async () => {
    const requestBody = {
      sessionId: 'test-session-789',
      behaviorData: {
        timeOnSite: 300,
        pageViews: 1,
      },
      contextData: {
        deviceType: 'desktop',
      },
    }

    const request = new NextRequest('http://localhost:3000/api/v1/ml/purchase-prediction', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('purchaseProbability')
  })
})
```

This implementation guide provides the foundational code structure and examples for Phase 1 of the AI Revenue Optimization Engine, focusing on real-time purchase prediction and dynamic pricing systems with proper testing coverage and error handling.