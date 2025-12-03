# Real API Testing Guide

This guide covers the phased approach to testing with the real OSM API.

## Prerequisites

✅ All safety mechanisms implemented and tested (22/22 tests passing)
✅ Real OAuth credentials configured in `.env.local`
✅ Redis running (`docker-compose up -d redis`)
✅ `NEXT_PUBLIC_USE_MSW=false` in `.env.local`

## Safety Mechanisms Active

- **Rate Limiting**: 80% safety buffer (800/1000 req/hr)
- **Circuit Breaker**: Soft lock at <10% quota, hard lock on X-Blocked
- **Read-Only Enforcement**: POST/PUT/DELETE/PATCH return 405
- **Caching**: 5min TTL to reduce redundant calls
- **OAuth**: Token rotation with 1hr expiry
- **Logging**: Structured logs with rate limit tracking

## Phase 1: Single Request Verification

**Goal**: Verify one API call works end-to-end

1. Start dev server: `npm run dev`
2. Log in via OSM OAuth at https://localhost:3000
3. Navigate to `/dashboard/api-browser`
4. Select "Get Events" endpoint
5. Click "Send Request"
6. **Expected Results**:
   - ✅ Response returned successfully
   - ✅ X-RateLimit headers visible in logs
   - ✅ Redis quota updated
   - ✅ Response cached (second request instant)

**Monitor**:
```bash
# Watch Next.js logs for rate limit info
# Check Redis quota
docker exec seee-redis-local redis-cli GET quota:osm_api
```

## Phase 2: 5-10 Requests (Different Endpoints)

**Goal**: Test multiple endpoint types, verify throttling

1. Try these endpoints via API Browser:
   - Get Events
   - Get Event Details (pick an event ID from Events response)
   - Get Members
   - Get Badges
   - Get Patrols

2. **Expected Results**:
   - ✅ All requests succeed
   - ✅ 50ms minimum spacing between requests
   - ✅ Quota decreases predictably
   - ✅ Cached responses return instantly

**Monitor**:
```bash
# Watch quota decrease
watch -n 1 'docker exec seee-redis-local redis-cli GET quota:osm_api'
```

## Phase 3: Soft Lock Test

**Goal**: Verify circuit breaker prevents quota exhaustion

1. Manually set quota to trigger soft lock:
   ```bash
   docker exec seee-redis-local redis-cli SET quota:osm_api 50
   docker exec seee-redis-local redis-cli EXPIRE quota:osm_api 3600
   ```

2. Attempt request via API Browser
3. **Expected Results**:
   - ✅ Request returns 429 Too Many Requests
   - ✅ Error message: "Rate limit approaching maximum..."
   - ✅ Retry-After header present

4. Reset quota:
   ```bash
   docker exec seee-redis-local redis-cli SET quota:osm_api 800
   ```

## Phase 4: Events List Integration

**Goal**: Test real-world usage pattern with Events List page

1. Build `/dashboard/events` page
2. Load 10-20 events
3. Monitor for 30 minutes
4. **Expected Results**:
   - ✅ Events load successfully
   - ✅ Quota stays well under 80%
   - ✅ No rate limit warnings
   - ✅ Caching reduces redundant calls

## Troubleshooting

### 401 Unauthorized
- Token expired → Log out and back in
- Check `osm_oauth:{userId}` exists in Redis

### 429 Too Many Requests
- Check quota: `docker exec seee-redis-local redis-cli GET quota:osm_api`
- Wait for quota to refresh (hourly from OSM)
- Or manually reset (testing only): `docker exec seee-redis-local redis-cli SET quota:osm_api 800`

### 503 Service Unavailable
- Redis down → `docker-compose up -d redis`
- Circuit breaker triggered → Check for `lock:osm_api` in Redis

### Rate Limit Headers Not Updating
- OSM may not return headers on every request
- Check logs for `parseRateLimitHeaders` output
- Verify dynamic reservoir is adjusting

## Monitoring Commands

```bash
# Current quota
docker exec seee-redis-local redis-cli GET quota:osm_api

# Check for locks
docker exec seee-redis-local redis-cli GET lock:osm_api

# View all OSM-related keys
docker exec seee-redis-local redis-cli KEYS '*osm*'

# Check cache entries
docker exec seee-redis-local redis-cli KEYS 'cache:*'

# Watch quota in real-time
watch -n 1 'docker exec seee-redis-local redis-cli GET quota:osm_api'
```

## Success Criteria

- [ ] Phase 1: Single request succeeds with rate limit tracking
- [ ] Phase 2: 5-10 requests complete without issues
- [ ] Phase 3: Soft lock prevents over-usage (429 response)
- [ ] Phase 4: Events List loads efficiently over time
- [ ] No X-Blocked responses received
- [ ] Quota never drops below 200 (20% buffer)
- [ ] All responses logged with timing info

## Next Steps

After successful real API testing:
1. ✅ Mark Phase 2.4 complete in `IMPLEMENTATION_PLAN.md`
2. ➡️ Proceed to Phase 2.5: Events List implementation
3. ➡️ Proceed to Phase 2.6: Playwright E2E tests
4. ➡️ Phase 3+: Data Visualization Dashboard
