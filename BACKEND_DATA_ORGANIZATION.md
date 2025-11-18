# Backend Data Organization - Customizable Pipelines

## 📊 Database Schema Overview

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
└────────┬────────┘
         │
         │ owner_id
         ▼
┌─────────────────┐         ┌──────────────────┐
│   pipelines     │◄────────│ pipeline_stages  │
│                 │ 1     * │                  │
│ - id            │         │ - id             │
│ - owner_id      │         │ - pipeline_id    │
│ - name          │         │ - name           │
│ - description   │         │ - color          │
│ - color         │         │ - stage_weight   │
│ - icon          │         │ - display_order  │
│ - display_order │         └──────────────────┘
│ - is_active     │
│ - is_default    │
└────────┬────────┘
         │
         │ 1
         │
         │ *
         ▼
    ┌────────┐
    │ deals  │
    │        │
    │ - id   │
    │ - pipeline_id       ──┐
    │ - pipeline_stage_id ──┘
    │ - stage (legacy)    │
    │ - address           │
    │ - price             │
    │ - ...               │
    └────────────────────┘
```

## 🔍 Relationships

1. **User → Pipelines** (1:Many)
   - Each user can have up to 5 pipelines
   - One pipeline must be marked as `is_default = true`

2. **Pipeline → Stages** (1:Many)
   - Each pipeline can have up to 10 stages
   - Stages are ordered by `display_order`

3. **Pipeline → Deals** (1:Many)
   - Each deal belongs to one pipeline
   - Deals can be moved between pipelines

4. **Pipeline Stage → Deals** (1:Many)
   - Each deal is in one stage within its pipeline
   - Stages can be dragged/dropped within the same pipeline

## 💾 Data Flow Examples

### Creating a New Deal
```javascript
// 1. Get user's default pipeline
const defaultPipeline = await getDefaultPipeline(userId);

// 2. Get first stage of that pipeline
const firstStage = await getFirstStage(defaultPipeline.id);

// 3. Create deal
const deal = {
  owner_id: userId,
  pipeline_id: defaultPipeline.id,
  pipeline_stage_id: firstStage.id,
  address: "123 Main St",
  price: 1000000,
  // ... other fields
};
```

### Moving Deal Between Stages (Same Pipeline)
```javascript
// Drag & drop within same pipeline
UPDATE deals 
SET pipeline_stage_id = 'new-stage-id'
WHERE id = 'deal-id' 
  AND pipeline_id = 'current-pipeline-id';
```

### Moving Deal to Different Pipeline
```javascript
// 1. Get first stage of target pipeline
const targetPipeline = await getPipeline(targetPipelineId);
const firstStage = await getFirstStage(targetPipeline.id);

// 2. Move deal
UPDATE deals
SET 
  pipeline_id = targetPipelineId,
  pipeline_stage_id = firstStage.id
WHERE id = 'deal-id';
```

### Querying Deals by Pipeline
```javascript
// Get all deals for "Listings" pipeline
const { data } = await supabase
  .from('deals')
  .select(`
    *,
    pipelines!inner(name, color, icon),
    pipeline_stages!inner(name, color, stage_weight)
  `)
  .eq('pipeline_id', listingsPipelineId)
  .order('pipeline_stages.display_order');
```

### Aggregating Deals Across All Pipelines (For Map)
```javascript
// Get all deals with pipeline info for map
const { data } = await supabase
  .from('deals')
  .select(`
    id,
    address,
    latitude,
    longitude,
    price,
    asset_type,
    pipelines(name, color, icon),
    pipeline_stages(name, color)
  `)
  .eq('owner_id', userId)
  .not('latitude', 'is', null);

// Group by pipeline for color coding
const dealsByPipeline = data.reduce((acc, deal) => {
  const pipelineName = deal.pipelines.name;
  if (!acc[pipelineName]) acc[pipelineName] = [];
  acc[pipelineName].push(deal);
  return acc;
}, {});
```

## 📈 Analytics & Metrics

### Pipeline Conversion Rates
```sql
SELECT 
  p.name as pipeline_name,
  ps.name as stage_name,
  COUNT(d.id) as deal_count,
  SUM(d.price) as total_value,
  AVG(ps.stage_weight) as avg_probability
FROM deals d
JOIN pipelines p ON p.id = d.pipeline_id
JOIN pipeline_stages ps ON ps.id = d.pipeline_stage_id
WHERE p.owner_id = 'user-id'
GROUP BY p.name, ps.name, ps.display_order
ORDER BY p.display_order, ps.display_order;
```

### Weighted Pipeline Value
```sql
SELECT 
  p.name,
  SUM(d.price * ps.stage_weight) as weighted_value
FROM deals d
JOIN pipelines p ON p.id = d.pipeline_id
JOIN pipeline_stages ps ON ps.id = d.pipeline_stage_id
WHERE p.owner_id = 'user-id'
GROUP BY p.name;
```

## 🎨 Pipeline Use Cases

### Example 1: Off-Market Pipeline
```
Stages:
1. Lead Generated → 2. Initial Contact → 3. NDA Signed → 
4. Tour Scheduled → 5. Under LOI → 6. Due Diligence → 
7. PSA Executed → 8. Closed
```

### Example 2: Listings Pipeline
```
Stages:
1. Pitch → 2. Listing Agreement → 3. Marketing → 
4. Showings → 5. Offer Received → 6. Under Contract → 
7. Closed
```

### Example 3: For Lease Pipeline
```
Stages:
1. Prospect → 2. Tour Scheduled → 3. Proposal Sent → 
4. Lease Negotiation → 5. Lease Signed → 6. Tenant Occupancy
```

### Example 4: Buyer-Side Pipeline
```
Stages:
1. Buyer Qualified → 2. Property Search → 3. Tours → 
4. Offer Submitted → 5. Under Contract → 6. Closed
```

### Example 5: Distressed/Note Pipeline
```
Stages:
1. Lead → 2. Initial Contact → 3. Package Review → 
4. Offer Submitted → 5. Workout Negotiation → 6. Closed
```

## 🗺️ Map Integration Strategy

### Marker Color Coding Options:

**Option A: Color by Pipeline**
```javascript
// Each pipeline has its own color
const markerColor = deal.pipelines.color;
```

**Option B: Color by Stage (within pipeline)**
```javascript
// Color by current stage
const markerColor = deal.pipeline_stages.color;
```

**Option C: Color by Asset Type (traditional)**
```javascript
// Traditional asset type coloring
const markerColor = getAssetTypeColor(deal.asset_type);
```

### Map Filters:
```javascript
// Filter controls
- Show All Pipelines ☑️
- Off-Market Only ☐
- Listings Only ☐
- For Lease Only ☐
- Buyer-Side Only ☐

// Combined with existing filters
- Asset Type Filter
- Stage Filter (across all pipelines or within selected pipeline)
- Price Range
- Size Range
```

## 🔐 Security Considerations

1. **Row Level Security (RLS)**
   - Users can only access their own pipelines
   - Team members can see shared pipelines (future)

2. **Validation Rules**
   - Max 5 pipelines per user
   - Max 10 stages per pipeline
   - Cannot delete default pipeline
   - Must have at least one active pipeline

3. **Data Integrity**
   - CASCADE delete: Deleting pipeline → deletes stages
   - SET NULL: Deleting pipeline → sets deals.pipeline_id to NULL
   - Cannot delete stage if deals exist in that stage (optional constraint)

## 🚀 Performance Optimizations

1. **Indexes Created**
   - `idx_pipelines_owner_id`
   - `idx_pipeline_stages_pipeline_id`
   - `idx_deals_pipeline_id`
   - `idx_deals_pipeline_stage_id`

2. **Query Optimization**
   - Use `select('*, pipelines!inner(...)')` for filtered joins
   - Prefetch pipeline data when loading deals page
   - Cache pipeline structure in frontend state

3. **Pagination**
   - Load deals by pipeline
   - Infinite scroll within each pipeline
   - Virtual scrolling for large deal lists

---

**This structure supports:**
✅ Multiple workflows (Off-Market, Listings, Lease, etc.)
✅ Flexible stage customization per pipeline
✅ Easy filtering and aggregation
✅ Map integration with multi-pipeline support
✅ Analytics and reporting
✅ Future team collaboration features
