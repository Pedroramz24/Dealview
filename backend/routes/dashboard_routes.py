"""Dashboard routes - Ready for Marketplace analytics."""
from fastapi import APIRouter, Depends
from typing import List
import time
import logging
import feedparser

from models import User
from utils.auth_helpers import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)

# News feed cache
news_cache = {
    'articles': [],
    'last_updated': 0,
    'cache_duration': 3600  # 1 hour in seconds
}


@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics for the current user's deals."""
    db = get_db()
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    
    total_pipeline_value = sum(deal.get('asking_price', 0) for deal in deals)
    total_deals = len(deals)
    avg_deal_size = total_pipeline_value / total_deals if total_deals > 0 else 0
    
    asset_type_distribution = {}
    for deal in deals:
        asset_type = deal.get('asset_type', 'Unknown')
        asset_type_distribution[asset_type] = asset_type_distribution.get(asset_type, 0) + 1
    
    stage_counts = {}
    for deal in deals:
        stage = deal.get('stage', 'New')
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
    
    return {
        "total_pipeline_value": total_pipeline_value,
        "total_deals": total_deals,
        "avg_deal_size": avg_deal_size,
        "asset_type_distribution": asset_type_distribution,
        "stage_counts": stage_counts
    }
@router.get("/dashboard/news")
async def get_market_news():
    """
    Fetch latest commercial real estate market news from RSS feeds.
    Filters for San Antonio, Texas, and regional relevance.
    Caches results for 1 hour to minimize requests.
    No authentication required - public news data.
    """
    try:
        # Check cache first
        current_time = time.time()
        if news_cache['articles'] and (current_time - news_cache['last_updated']) < news_cache['cache_duration']:
            logger.info("Returning cached news articles")
            return {"articles": news_cache['articles'], "count": len(news_cache['articles']), "cached": True}
        
        logger.info("Fetching fresh news from RSS feeds with Texas + Macro filter")
        
        # Define Texas-specific RSS feeds (PRIORITY - most relevant)
        texas_rss_feeds = [
            {
                'url': 'https://www.bizjournals.com/sanantonio/news/commercial-real-estate/feed',
                'source': 'San Antonio Business Journal',
                'type': 'local'
            },
            {
                'url': 'https://www.bizjournals.com/austin/news/commercial-real-estate/feed',
                'source': 'Austin Business Journal',
                'type': 'local'
            },
            {
                'url': 'https://www.bizjournals.com/houston/news/commercial-real-estate/feed',
                'source': 'Houston Business Journal',
                'type': 'local'
            },
            {
                'url': 'https://www.bizjournals.com/dallas/news/commercial-real-estate/feed',
                'source': 'Dallas Business Journal',
                'type': 'local'
            }
        ]
        
        # Define National CRE RSS feeds (for macro-economic news only)
        national_rss_feeds = [
            {
                'url': 'https://commercialobserver.com/feed/',
                'source': 'Commercial Observer',
                'type': 'national'
            },
            {
                'url': 'https://www.globest.com/rss/',
                'source': 'GlobeSt',
                'type': 'national'
            },
            {
                'url': 'https://commercialsearch.com/news/feed',
                'source': 'Commercial Property Executive',
                'type': 'national'
            }
        ]
        
        # Location keywords for filtering (San Antonio and broader Texas/Southwest region)
        location_keywords = [
            'san antonio', 'texas', 'austin', 'houston', 'dallas', 'fort worth',
            'tx', 'southwest', 'south texas', 'bexar county', 'alamo city',
            'san marcos', 'new braunfels', 'el paso', 'corpus christi', 'waco',
            'lubbock', 'arlington', 'plano', 'irving', 'lone star', 'dfw'
        ]
        
        # National MACRO-ECONOMIC keywords (affects all CRE regardless of location)
        # Keep this broad to capture important national trends
        macro_economic_keywords = [
            # Fed and monetary policy
            'federal reserve', 'fed rate', 'interest rate', 'jerome powell',
            'basis point', 'monetary policy', 'inflation', 'fed meeting',
            'treasury yield', 'economic outlook', 'gdp', 'unemployment',
            # National CRE trends
            'national', 'nationwide', 'u.s.', 'united states', 'across america',
            'cap rate', 'capitalization rate', 'investment trend',
            'market outlook', 'economic forecast', 'recession',
            # Lending and financing
            'cmbs', 'commercial mortgage', 'fannie mae', 'freddie mac',
            'lending standard', 'loan origination', 'debt market',
            # Broad market indicators
            'vacancy rate', 'absorption', 'construction start',
            'supply and demand', 'market cycle', 'real estate cycle'
        ]
        
        # EXCLUDE these - other city-specific news we don't care about
        # Note: We only exclude if these appear AND Texas keywords don't also appear
        exclude_cities = [
            'new york city', 'manhattan', 'brooklyn', 'nyc ',
            'los angeles', ' la ', 'san francisco', 'oakland', 'san diego', 'san jose', 'california ',
            'miami', 'florida ', 'orlando', 'tampa',
            'chicago', 'illinois ',
            'boston', 'massachusetts',
            'washington dc', ' dc ',
            'seattle', 'portland, or',
            'denver', 'colorado ',
            'atlanta', 'georgia ',
            'phoenix', 'arizona ',
            'las vegas', 'nevada ',
            'philadelphia', 'pennsylvania',
            'detroit', 'michigan '
        ]
        
        articles = []
        total_checked = 0
        local_articles = 0
        macro_articles = 0
        
        # PHASE 1: Fetch from Texas-specific feeds first (highest priority - NO FILTERING)
        logger.info("📍 PHASE 1: Fetching Texas-specific RSS feeds...")
        for feed_info in texas_rss_feeds:
            try:
                feed = feedparser.parse(feed_info['url'])
                logger.info(f"  ✅ {feed_info['source']}: {len(feed.entries)} entries found")
                
                # Texas feeds: Accept ALL articles (they're already Texas-specific)
                for entry in feed.entries[:5]:
                    total_checked += 1
                    
                    title = entry.get('title', 'Untitled')
                    description = entry.get('summary', '')
                    if not description and 'content' in entry:
                        description = entry.content[0].get('value', '')
                    
                    # Clean and format
                    description = re.sub(r'<[^>]+>', '', description)
                    description = description[:250] + '...' if len(description) > 250 else description
                    
                    # Format time
                    published_time = entry.get('published_parsed') or entry.get('updated_parsed')
                    if published_time:
                        pub_datetime = datetime(*published_time[:6])
                        time_diff = datetime.now() - pub_datetime
                        if time_diff.days > 0:
                            time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
                        elif time_diff.seconds >= 3600:
                            hours = time_diff.seconds // 3600
                            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
                        else:
                            minutes = time_diff.seconds // 60
                            time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                    else:
                        time_ago = "Recently"
                    
                    articles.append({
                        'title': title,
                        'description': description,
                        'source': feed_info['source'],
                        'url': entry.get('link', ''),
                        'publishedAt': time_ago,
                        'relevanceType': 'local'
                    })
                    
                    local_articles += 1
                    logger.info(f"    ✅ [TEXAS] {title[:70]}...")
                    
            except Exception as feed_error:
                logger.warning(f"  ⚠️  {feed_info['source']} failed: {str(feed_error)}")
                continue
        
        logger.info(f"📍 Phase 1 Complete: {local_articles} Texas articles collected")
        
        # PHASE 2: Fetch from national feeds (WITH FILTERING for macro-economic only)
        logger.info("🌎 PHASE 2: Fetching national macro-economic news...")
        for feed_info in national_rss_feeds:
            try:
                feed = feedparser.parse(feed_info['url'])
                logger.info(f"  ✅ {feed_info['source']}: {len(feed.entries)} entries found")
                
                # National feeds: Filter for macro-economic relevance only
                for entry in feed.entries[:10]:
                    total_checked += 1
                    
                    title = entry.get('title', 'Untitled')
                    description = entry.get('summary', '')
                    if not description and 'content' in entry:
                        description = entry.content[0].get('value', '')
                    
                    # Clean HTML
                    description = re.sub(r'<[^>]+>', '', description)
                    article_text = (title + ' ' + description).lower()
                    
                    # Check if it's about another city (EXCLUDE)
                    is_other_city = False
                    matched_exclude = None
                    for exclude_city in exclude_cities:
                        if exclude_city in article_text:
                            is_other_city = True
                            matched_exclude = exclude_city
                            break
                    
                    if is_other_city:
                        logger.info(f"    ⏭️  EXCLUDED ({matched_exclude}): {title[:70]}")
                        continue
                    
                    # Check if macro-economic news
                    is_macro = False
                    for keyword in macro_economic_keywords:
                        if keyword in article_text:
                            is_macro = True
                            break
                    
                    if is_macro:
                        # Format time
                        published_time = entry.get('published_parsed') or entry.get('updated_parsed')
                        if published_time:
                            pub_datetime = datetime(*published_time[:6])
                            time_diff = datetime.now() - pub_datetime
                            if time_diff.days > 0:
                                time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
                            elif time_diff.seconds >= 3600:
                                hours = time_diff.seconds // 3600
                                time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
                            else:
                                minutes = time_diff.seconds // 60
                                time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                        else:
                            time_ago = "Recently"
                        
                        description = description[:250] + '...' if len(description) > 250 else description
                        
                        articles.append({
                            'title': title,
                            'description': description,
                            'source': feed_info['source'],
                            'url': entry.get('link', ''),
                            'publishedAt': time_ago,
                            'relevanceType': 'macro'
                        })
                        
                        macro_articles += 1
                        logger.info(f"    ✅ [MACRO] {title[:70]}...")
                    
            except Exception as feed_error:
                logger.warning(f"  ⚠️  {feed_info['source']} failed: {str(feed_error)}")
                continue
        
        logger.info(f"🌎 Phase 2 Complete: {macro_articles} macro-economic articles collected")
        
        # Sort by most recent and limit to 15 articles
        articles = articles[:15]
        
        # Update cache
        news_cache['articles'] = articles
        news_cache['last_updated'] = current_time
        
        logger.info(f"📊 FINAL RESULTS: Texas: {local_articles} | Macro: {macro_articles} | Total Returned: {len(articles)}")
        return {"articles": articles, "count": len(articles), "cached": False, "stats": {"local": local_articles, "macro": macro_articles, "total_checked": total_checked}}
        
    except Exception as e:
        logger.error(f"News endpoint error: {str(e)}")
        # Return placeholder on error
        return {
            "articles": [],
            "count": 0,
            "error": True
        }
