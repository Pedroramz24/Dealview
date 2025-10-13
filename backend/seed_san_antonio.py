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

# Sample data for San Antonio, TX
sample_users = [
    {
        "id": "user-1",
        "email": "pedro@test.com",
        "full_name": "Pedro Armando",
        "role": "admin",
        "hashed_password": pwd_context.hash("password123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

sample_deals = [
    {
        "id": "deal-1",
        "property_address": "100 W Houston St, San Antonio, TX 78205",
        "asset_type": "Office",
        "description": "Prime downtown office building near River Walk with modern amenities and stunning city views.",
        "asking_price": 18500000,
        "building_size": 75000,
        "lot_size": 10000,
        "lot_acres": 0.23,
        "occupancy": "92%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
        "latitude": 29.4241,
        "longitude": -98.4936,
        "notes": "Excellent downtown location near Riverwalk. Strong tenant mix.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-2",
        "property_address": "7500 Broadway, San Antonio, TX 78209",
        "asset_type": "Retail",
        "description": "High-traffic retail center in Alamo Heights with excellent visibility and strong demographics.",
        "asking_price": 12500000,
        "building_size": 38000,
        "lot_size": 52000,
        "lot_acres": 1.19,
        "occupancy": "88%",
        "stage": "Underwriting",
        "primary_image_url": "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=800",
        "latitude": 29.4801,
        "longitude": -98.4623,
        "notes": "Premium location. Strong retail corridor.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-3",
        "property_address": "8500 IH-10 West, San Antonio, TX 78230",
        "asset_type": "Industrial",
        "description": "Modern warehouse facility with excellent I-10 access. Perfect for logistics and distribution.",
        "asking_price": 9800000,
        "building_size": 110000,
        "lot_size": 185000,
        "lot_acres": 4.25,
        "occupancy": "100%",
        "stage": "Negotiation",
        "primary_image_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
        "latitude": 29.4889,
        "longitude": -98.5850,
        "notes": "Strategic location near Medical Center. Long-term tenant.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-4",
        "property_address": "255 E Basse Rd, San Antonio, TX 78209",
        "asset_type": "Retail",
        "description": "Upscale retail center in Quarry Market. High-end tenants and excellent foot traffic.",
        "asking_price": 15200000,
        "building_size": 42000,
        "lot_size": 48000,
        "lot_acres": 1.10,
        "occupancy": "95%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800",
        "latitude": 29.4886,
        "longitude": -98.4679,
        "notes": "Premium shopping destination. Strong tenant roster.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-5",
        "property_address": "9800 Airport Blvd, San Antonio, TX 78216",
        "asset_type": "Office",
        "description": "Class A office building near San Antonio Airport. Modern infrastructure and professional campus setting.",
        "asking_price": 22000000,
        "building_size": 88000,
        "lot_size": 95000,
        "lot_acres": 2.18,
        "occupancy": "90%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        "latitude": 29.5156,
        "longitude": -98.4689,
        "notes": "Airport proximity. Growing corporate submarket.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-6",
        "property_address": "50 Acres, Bulverde Rd, San Antonio, TX 78247",
        "asset_type": "Land",
        "description": "Prime development land in fast-growing Stone Oak area. Approved for mixed-use development.",
        "asking_price": 8500000,
        "building_size": None,
        "lot_size": 2178000,
        "lot_acres": 50.0,
        "occupancy": None,
        "stage": "Under Contract",
        "primary_image_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
        "latitude": 29.6214,
        "longitude": -98.4615,
        "notes": "Excellent development site. Strong demographics.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-7",
        "property_address": "17000 IH-35 North, San Antonio, TX 78232",
        "asset_type": "Industrial",
        "description": "Distribution center with excellent highway access. Climate-controlled warehouse space.",
        "asking_price": 14200000,
        "building_size": 142000,
        "lot_size": 225000,
        "lot_acres": 5.17,
        "occupancy": "100%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
        "latitude": 29.5856,
        "longitude": -98.4495,
        "notes": "Triple-net lease. Investment grade tenant.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-8",
        "property_address": "1604 W Loop, San Antonio, TX 78230",
        "asset_type": "Office",
        "description": "Medical office building near Methodist Hospital. Professional tenant mix.",
        "asking_price": 11800000,
        "building_size": 48000,
        "lot_size": 42000,
        "lot_acres": 0.96,
        "occupancy": "96%",
        "stage": "Underwriting",
        "primary_image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
        "latitude": 29.4920,
        "longitude": -98.5842,
        "notes": "Medical Center submarket. Stable tenancy.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-9",
        "property_address": "4500 Fredericksburg Rd, San Antonio, TX 78201",
        "asset_type": "Retail",
        "description": "Neighborhood retail center with strong anchor tenant. Value-add opportunity.",
        "asking_price": 7500000,
        "building_size": 32000,
        "lot_size": 48000,
        "lot_acres": 1.10,
        "occupancy": "82%",
        "stage": "New",
        "primary_image_url": "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=800",
        "latitude": 29.4698,
        "longitude": -98.5245,
        "notes": "Below market rents. Upside potential.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": None,
        "created_by": "user-1"
    },
    {
        "id": "deal-10",
        "property_address": "15800 Nacogdoches Rd, San Antonio, TX 78247",
        "asset_type": "Retail",
        "description": "Power center in high-growth area. National tenants with strong sales.",
        "asking_price": 19500000,
        "building_size": 68000,
        "lot_size": 125000,
        "lot_acres": 2.87,
        "occupancy": "94%",
        "stage": "Qualified",
        "primary_image_url": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800",
        "latitude": 29.5989,
        "longitude": -98.4398,
        "notes": "Strong retailer mix. Excellent demographics.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-11",
        "property_address": "8000 IH-10 East, San Antonio, TX 78219",
        "asset_type": "Industrial",
        "description": "Flex industrial space near downtown. Perfect for manufacturing or distribution.",
        "asking_price": 6200000,
        "building_size": 65000,
        "lot_size": 95000,
        "lot_acres": 2.18,
        "occupancy": "85%",
        "stage": "Negotiation",
        "primary_image_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
        "latitude": 29.4158,
        "longitude": -98.3965,
        "notes": "Value-add opportunity. Good bones.",
        "contacts": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_contact": datetime.now(timezone.utc).isoformat(),
        "created_by": "user-1"
    },
    {
        "id": "deal-12",
        "property_address": "19000 Stone Oak Pkwy, San Antonio, TX 78258",
        "asset_type": "Office",
        "description": "Premier Stone Oak office building. Class A finishes and amenities.",
        "asking_price": 28500000,
        "building_size": 95000,
        "lot_size": 115000,
        "lot_acres": 2.64,
        "occupancy": "97%",
        "stage": "Closed",
        "primary_image_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        "latitude": 29.6389,
        "longitude": -98.4856,
        "notes": "Trophy asset. Best-in-class building.",
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
        "name": "Michael Rodriguez",
        "email": "mrodriguez@texascap.com",
        "phone": "(210) 555-0123",
        "company": "Texas Capital Partners",
        "tags": ["Buyer", "Principal", "Office", "Retail"],
        "notes": "Active buyer looking for value-add opportunities in San Antonio.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-2",
        "name": "Sarah Martinez",
        "email": "smartinez@logistics.com",
        "phone": "(210) 555-0187",
        "company": "Alamo Logistics Group",
        "tags": ["Buyer", "Industrial"],
        "notes": "Seeking warehouse space near I-10 corridor.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-3",
        "name": "Robert Johnson",
        "email": "rjohnson@sabrokers.com",
        "phone": "(210) 555-0199",
        "company": "Johnson Commercial Realty",
        "tags": ["Broker", "Retail", "Office"],
        "notes": "Well-connected local broker with institutional clients.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-4",
        "name": "Jennifer Garcia",
        "email": "jgarcia@developers.com",
        "phone": "(210) 555-0156",
        "company": "Garcia Development Company",
        "tags": ["Buyer", "Principal", "Land"],
        "notes": "Land developer focused on Stone Oak area.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-5",
        "name": "David Thompson",
        "email": "dthompson@investors.com",
        "phone": "(210) 555-0134",
        "company": "Thompson Investment Group",
        "tags": ["Investor", "Office", "Industrial"],
        "notes": "Conservative investor. Prefers stabilized assets.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-6",
        "name": "Maria Hernandez",
        "email": "mhernandez@retail.com",
        "phone": "(210) 555-0142",
        "company": "Hernandez Retail Properties",
        "tags": ["Seller", "Broker", "Retail"],
        "notes": "Represents family office with retail portfolio.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-7",
        "name": "James Wilson",
        "email": "jwilson@industrial.com",
        "phone": "(210) 555-0178",
        "company": "Wilson Industrial Partners",
        "tags": ["Buyer", "Industrial", "Principal"],
        "notes": "Active buyer in San Antonio industrial market.",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "contact-8",
        "name": "Lisa Anderson",
        "email": "landerson@offices.com",
        "phone": "(210) 555-0165",
        "company": "Anderson Office Properties",
        "tags": ["Seller", "Office"],
        "notes": "Portfolio owner in Medical Center area.",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Seeding San Antonio database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.deals.delete_many({})
    await db.contacts.delete_many({})
    
    # Insert sample data
    await db.users.insert_many(sample_users)
    print(f"Inserted {len(sample_users)} users")
    
    await db.deals.insert_many(sample_deals)
    print(f"Inserted {len(sample_deals)} San Antonio deals")
    
    await db.contacts.insert_many(sample_contacts)
    print(f"Inserted {len(sample_contacts)} contacts")
    
    print("San Antonio database seeded successfully!")
    print("\nTest credentials:")
    print("Email: pedro@test.com")
    print("Password: password123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
