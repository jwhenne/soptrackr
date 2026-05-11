# SOPTrackr - Dealership Management Portal

A multi-tenant SaaS platform for automotive dealerships to manage parts inventory, service orders, and user permissions across multiple locations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Auth0 account (free tier works)

### 1. Clone & Install
```bash
cd soptrackr
npm install
```

### 2. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE soptrackr;
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Update `.env` with your database connection:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/soptrackr
```

### 4. Run Database Migrations
```bash
npm run db:migrate
```

### 5. Seed Sample Data
```bash
npm run db:seed
```

### 6. Auth0 Setup (Optional for MVP)
1. Create Auth0 account at https://auth0.com
2. Create new application (Regular Web Application)
3. Update `.env` with Auth0 credentials:
```env
AUTH0_SECRET=your-secret-here
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

### 7. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## 🏗️ Architecture Overview

### Multi-Tenancy
- **Shared database, separate data** - All dealerships use the same database with row-level security
- **PostgreSQL Row Level Security (RLS)** automatically filters data by dealership
- **Dealership context** set on every request to ensure data isolation

### Permission System
Role-based permissions with special focus on **bin location security**:

| Role | View Parts | Edit Parts | View Bin Location | Edit Bin Location |
|------|------------|------------|-------------------|-------------------|
| Parts Personnel | ✅ | ✅ | ✅ | ✅ |
| Service Advisor | ✅ | ❌ | ❌ | ❌ |
| Technician | ✅ | ❌ | ❌ | ❌ |
| Manager | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ❌ |

### Database Schema
```
organizations (your company)
├── dealerships (individual locations)
│   ├── users (via user_dealership_roles)
│   ├── parts (inventory with bin_location)
│   ├── service_orders
│   └── parts_requests (SOPs)
└── audit_logs (change tracking)
```

## 🧪 Testing the Key Feature

The core feature is **bin location security**. Test it with the sample data:

### Sample Users (after seeding):
1. **john.parts@downtown-toyota.com** (Parts Personnel)
   - ✅ Can see bin locations (A1-05, B3-12, etc.)
   - ✅ Can edit bin locations

2. **sarah.advisor@downtown-toyota.com** (Service Advisor)  
   - ✅ Can see parts list
   - ❌ Cannot see bin locations
   - ❌ Cannot edit anything

3. **mike.tech@downtown-toyota.com** (Technician)
   - ✅ Can see parts list  
   - ❌ Cannot see bin locations

### Test Scenarios:
1. **Parts Request Flow**: Service advisor creates SOP → Parts personnel sees request → Parts personnel adds bin location → Technician gets notified but doesn't see bin location
2. **Cross-Dealership Security**: Users only see their dealership's data
3. **Permission Enforcement**: API blocks unauthorized access

## 📊 Sample Data

After running `npm run db:seed`:

**Dealerships:**
- Downtown Toyota (DT001) 
- Westside Volvo (WV002)

**Parts (Downtown Toyota):**
- Oil Filter (Bin: A1-05)
- Brake Pads (Bin: B3-12) 
- Air Filter (Bin: A1-08)
- Spark Plugs (Bin: C2-15)

**Parts (Westside Volvo):**
- Oil Filter (Bin: V1-03)
- Brake Discs (Bin: V2-08)
- Cabin Filter (Bin: V1-12)

## 🚀 Development Roadmap

### Phase 1: Core MVP ✅
- [x] Multi-tenant database with RLS
- [x] User management and permissions
- [x] Parts inventory with bin location security
- [x] Basic UI components

### Phase 2: Service Orders (Next)
- [ ] Service order creation and management
- [ ] SOP request workflow
- [ ] Real-time notifications
- [ ] Audit logging

### Phase 3: Advanced Features
- [ ] Auth0 integration
- [ ] DMS integrations (CDK, Reynolds, etc.)
- [ ] Advanced reporting
- [ ] Mobile app

### Phase 4: Enterprise
- [ ] SSO support
- [ ] Advanced audit trails
- [ ] Multi-organization support
- [ ] API for third-party integrations

## 🔧 Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Row Level Security
- **Styling**: Tailwind CSS
- **Authentication**: Auth0 (planned)
- **Deployment**: Vercel (recommended)

## 🛠️ Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed sample data
```

## 🔐 Security Features

1. **Row Level Security**: PostgreSQL RLS policies ensure data isolation
2. **Permission-Based UI**: Components only render for authorized users
3. **API Protection**: Every endpoint checks user permissions
4. **Secure Bin Locations**: Special protection for sensitive inventory data
5. **Audit Logging**: Track all changes for compliance

## 📝 API Endpoints (Planned)

```
GET  /api/parts              # List parts (filtered by permissions)
POST /api/parts              # Create new part
PUT  /api/parts/:id          # Update part (includes bin location)
GET  /api/service-orders     # List service orders
POST /api/parts-requests     # Create SOP request
PUT  /api/parts-requests/:id # Update request status
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Database Hosting Options
- **Supabase** (easiest, includes auth)
- **AWS RDS** (production-grade)
- **Railway** (developer-friendly)
- **Neon** (serverless Postgres)

## 📞 Next Steps

1. **Test the MVP**: Run the app and test bin location permissions
2. **Add Auth0**: Set up real authentication
3. **Build Service Orders**: Add SOP request workflow
4. **Deploy**: Get it online for real testing
5. **Scale**: Add more dealerships and users

## 🎯 Business Model

- **Per-dealership pricing** ($99-299/month per location)
- **DMS integration premium** (+$50/month per integration)
- **Enterprise features** (SSO, advanced reporting)
- **White-label opportunities** for dealer groups

---

**Ready to start building?** Run `npm run dev` and visit http://localhost:3000

Need help? Check the issues or start with the sample data to see the permissions in action!
