/**
 * HP Analytics API Endpoint - Serverless Function
 * Handles tracking data collection and validation
 */

export default function handler(req, res) {
    // CORSヘッダー設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-HP-Analytics-Version');

    // プリフライトリクエスト対応
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // POSTリクエストのみ受け付け
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const data = req.body;
        
        // 基本的なバリデーション
        if (!data || !data.siteId || !data.sessionId) {
            res.status(400).json({ 
                error: 'Invalid data: siteId and sessionId are required',
                received: { siteId: !!data?.siteId, sessionId: !!data?.sessionId }
            });
            return;
        }

        // データサイズ制限（1MB）
        const dataSize = JSON.stringify(data).length;
        if (dataSize > 1024 * 1024) {
            res.status(413).json({ error: 'Payload too large' });
            return;
        }

        // 成功レスポンス
        res.status(200).json({
            success: true,
            message: 'Data received successfully',
            siteId: data.siteId,
            timestamp: new Date().toISOString(),
            dataSize: dataSize,
            eventsCount: data.events?.length || 0,
            pageViewsCount: data.pageViews?.length || 0
        });

        // ログ出力（デバッグ用）
        console.log(`📊 HP Analytics: Data received from ${data.siteId}`, {
            sessionId: data.sessionId,
            events: data.events?.length || 0,
            pageViews: data.pageViews?.length || 0,
            errors: data.errors?.length || 0,
            size: dataSize
        });

    } catch (error) {
        console.error('HP Analytics API Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to process tracking data'
        });
    }
}