import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Sample data
sample_users = [
    {
        "id": "user-1",
        "email": "pedro@armando.com",
        "full_name": "Pedro Armando",
        "role": "admin",
        "hashed_password": pwd_context.hash("password123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

sample_deals = [
    {
        "id": "deal-1",
        "property_address": "350 S Grand Ave, Los Angeles, CA 90071",
        "asset_type": "Office",
        "description": "Prime downtown office building with modern amenities and stunning city views. Recently renovated with state-of-the-art infrastructure.",
        "asking_price": 25000000,
        "building_size": 85000,
        "lot_size": 12000,
        "lot_acres": 0.28,
        "occupancy": "95%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
        "latitude": 34.0522,
        "longitude": -118.2437,
        "notes": "High-quality tenant mix. Strong cash flow. Owner looking for quick close.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-2",
        "property_address": "1201 Ocean Ave, Santa Monica, CA 90401",
        "asset_type": "Retail",
        "description": "High-traffic retail center near the beach with excellent visibility. Mixed-use development opportunity.",
        "asking_price": 18500000,
        "building_size": 45000,
        "lot_size": 18000,
        "lot_acres": 0.41,
        "occupancy": "88%",
        "stage": "Underwriting",
        "primary_image_url": "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=800",
        "latitude": 34.0195,
        "longitude": -118.4912,
        "notes": "Strong retail corridor. Several national tenants interested.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-3",
        "property_address": "4567 Industrial Way, Commerce, CA 90040",
        "asset_type": "Industrial",
        "description": "Modern warehouse facility with high ceilings and excellent truck access. Perfect for logistics operations.",
        "asking_price": 12000000,
        "building_size": 125000,
        "lot_size": 200000,
        "lot_acres": 4.59,
        "occupancy": "100%",
        "stage": "Negotiation",
        "primary_image_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
        "latitude": 34.0067,
        "longitude": -118.1598,
        "notes": "Long-term tenant with strong credit. Below market rent.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-4",
        "property_address": "789 Sunset Blvd, West Hollywood, CA 90069",
        "asset_type": "Retail",
        "description": "Iconic Sunset Strip location with incredible foot traffic. Ideal for flagship retail or restaurant.",
        "asking_price": 8900000,
        "building_size": 12000,
        "lot_size": 8000,
        "lot_acres": 0.18,
        "occupancy": "Vacant",
        "stage": "New",
        "primary_image_url": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800",
        "latitude": 34.0901,
        "longitude": -118.3850,
        "notes": "Redevelopment opportunity. High visibility location.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": None,
        "created_by": "user-1"
    },
    {
        "id": "deal-5",
        "property_address": "2500 Colorado Blvd, Pasadena, CA 91107",
        "asset_type": "Office",
        "description": "Class A office building in Old Pasadena. Beautiful historic architecture with modern interior.",
        "asking_price": 15750000,
        "building_size": 62000,
        "lot_size": 15000,
        "lot_acres": 0.34,
        "occupancy": "92%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        "latitude": 34.1478,
        "longitude": -118.1445,
        "notes": "Strong tenant roster. Well-maintained property.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-6",
        "property_address": "15 Acres, Malibu Canyon Rd, Malibu, CA 90265",
        "asset_type": "Land",
        "description": "Prime development land with ocean views. Approved for residential subdivision.",
        "asking_price": 22500000,
        "building_size": None,
        "lot_size": 653400,
        "lot_acres": 15.0,
        "occupancy": None,
        "stage": "Under Contract",
        "primary_image_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
        "latitude": 34.0259,
        "longitude": -118.7798,
        "notes": "Entitlements in place. Ready for development.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-7",
        "property_address": "8900 Wilshire Blvd, Beverly Hills, CA 90211",
        "asset_type": "Office",
        "description": "Prestigious Beverly Hills address. Trophy office building with luxury finishes.",
        "asking_price": 42000000,
        "building_size": 95000,
        "lot_size": 20000,
        "lot_acres": 0.46,
        "occupancy": "98%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
        "latitude": 34.0686,
        "longitude": -118.3823,
        "notes": "Blue-chip tenant roster. Exceptional location.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-8",
        "property_address": "3400 Airport Ave, Santa Monica, CA 90405",
        "asset_type": "Industrial",
        "description": "Flex industrial space near airport. Perfect for tech or creative office.",
        "asking_price": 9800000,
        "building_size": 55000,
        "lot_size": 75000,
        "lot_acres": 1.72,
        "occupancy": "85%",
        "stage": "New",
        "primary_image_url": "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
        "latitude": 34.0158,
        "longitude": -118.4513,
        "notes": "Creative office conversion potential.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": None,
        "created_by": "user-1"
    },
    {
        "id": "deal-9",
        "property_address": "567 S Spring St, Los Angeles, CA 90013",
        "asset_type": "Retail",
        "description": "Historic downtown retail building. Mixed-use potential with ground floor retail.",
        "asking_price": 6500000,
        "building_size": 28000,
        "lot_size": 10000,
        "lot_acres": 0.23,
        "occupancy": "75%",
        "stage": "Negotiation",
        "primary_image_url": "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=800",
        "latitude": 34.0465,
        "longitude": -118.2515,
        "notes": "Value-add opportunity. Arts District adjacency.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-10",
        "property_address": "25 Acres, Lancaster Blvd, Lancaster, CA 93534",
        "asset_type": "Land",
        "description": "Large industrial land parcel with freeway access. Ideal for logistics development.",
        "asking_price": 5000000,
        "building_size": None,
        "lot_size": 1089000,
        "lot_acres": 25.0,
        "occupancy": None,
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
        "latitude": 34.6868,
        "longitude": -118.1368,
        "notes": "Excellent freeway access. Growing industrial market.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-11",
        "property_address": "12000 W Pico Blvd, Los Angeles, CA 90064",
        "asset_type": "Office",
        "description": "West LA office campus with ample parking. Modern amenities and great natural light.",
        "asking_price": 19200000,
        "building_size": 72000,
        "lot_size": 35000,
        "lot_acres": 0.80,
        "occupancy": "90%",
        "stage": "Underwriting",
        "primary_image_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        "latitude": 34.0355,
        "longitude": -118.4356,
        "notes": "Tech-heavy tenant base. Strong rent growth.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-12",
        "property_address": "7500 Melrose Ave, Los Angeles, CA 90046",
        "asset_type": "Retail",
        "description": "Trendy Melrose corridor retail. High foot traffic and strong retail comps.",
        "asking_price": 11500000,
        "building_size": 18000,
        "lot_size": 12000,
        "lot_acres": 0.28,
        "occupancy": "100%",
        "stage": "Closed",
        "primary_image_url": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800",
        "latitude": 34.0836,
        "longitude": -118.3533,
        "notes": "Strong tenant roster. Premium location.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    }
]

sample_contacts = [
    {
        "id": "contact-1",
        "name": "Michael Chen",
        "email": "mchen@realestate.com",
        "phone": "(310) 555-0123",
        "company": "Chen Capital Partners",
        "tags": ["Buyer", "Principal", "Office", "Retail"],
        "notes": "Active buyer looking for value-add opportunities in LA.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-2",
        "name": "Sarah Johnson",
        "email": "sjohnson@logistics.com",
        "phone": "(562) 555-0187",
        "company": "Pacific Logistics Group",
        "tags": ["Buyer", "Industrial"],
        "notes": "Seeking warehouse space for expansion.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-3",
        "name": "Robert Martinez",
        "email": "rmartinez@brokers.com",
        "phone": "(213) 555-0199",
        "company": "Martinez Commercial Realty",
        "tags": ["Broker", "Retail", "Office"],
        "notes": "Well-connected broker with institutional clients.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-4",
        "name": "Jennifer Lee",
        "email": "jlee@developers.com",
        "phone": "(424) 555-0156",
        "company": "Skyline Development",
        "tags": ["Buyer", "Principal", "Land"],
        "notes": "Land developer focused on residential projects.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-5",
        "name": "David Thompson",
        "email": "dthompson@investors.com",
        "phone": "(818) 555-0134",
        "company": "Thompson Investment Group",
        "tags": ["Investor", "Office", "Industrial"],
        "notes": "Conservative investor. Prefers stabilized assets.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-6",
        "name": "Maria Garcia",
        "email": "mgarcia@retail.com",
        "phone": "(626) 555-0142",
        "company": "Garcia Retail Properties",
        "tags": ["Seller", "Broker", "Retail"],
        "notes": "Represents family office with retail portfolio.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-7",
        "name": "James Wilson",
        "email": "jwilson@industrial.com",
        "phone": "(909) 555-0178",
        "company": "Wilson Industrial Partners",
        "tags": ["Buyer", "Industrial", "Principal"],
        "notes": "Active buyer in Inland Empire market.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-8",
        "name": "Lisa Anderson",
        "email": "landerson@offices.com",
        "phone": "(310) 555-0165",
        "company": "Anderson Office Properties",
        "tags": ["Seller", "Office"],
        "notes": "Portfolio owner looking to divest Class B assets.",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Seeding database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.deals.delete_many({})
    await db.contacts.delete_many({})
    
    # Insert sample data
    await db.users.insert_many(sample_users)
    print(f"Inserted {len(sample_users)} users")
    
    await db.deals.insert_many(sample_deals)
    print(f"Inserted {len(sample_deals)} deals")
    
    await db.contacts.insert_many(sample_contacts)
    print(f"Inserted {len(sample_contacts)} contacts")
    
    print("Database seeded successfully!")
    print("\nTest credentials:")
    print("Email: pedro@armando.com")
    print("Password: password123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
