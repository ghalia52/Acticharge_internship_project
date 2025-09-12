import pandas as pd
import numpy as np
import uuid
import joblib
import io
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.cosmos import CosmosClient
from azure.storage.blob import BlobServiceClient
import warnings

warnings.filterwarnings("ignore")

# ----------------------------
# 1. Load Credentials from Key Vault
# ----------------------------
vault_url = "https://keycosmos.vault.azure.net/"
credential = DefaultAzureCredential()
kv_client = SecretClient(vault_url=vault_url, credential=credential)

try:
    COSMOS_ENDPOINT = kv_client.get_secret("COSMOS-LINK").value  
    COSMOS_KEY = kv_client.get_secret("COSMOS-KEY").value
    BLOB_CONNECTION_STRING = kv_client.get_secret("BLOB-CONNECTION-STRING").value
    print("Successfully retrieved credentials from Key Vault")

    DATABASE_NAME = 'iot_data'
    SOURCE_CONTAINER_NAME = 'vehicle_data'
    PREDICTION_CONTAINER_NAME = 'vehicle_predictions'
    
    # Blob storage configuration
    BLOB_CONTAINER_NAME = 'models'
    MODEL_BLOB_NAME = 'gradient_boosting_model.pkl'
    
except Exception as e:
    print(f"Error retrieving secrets: {e}")
    raise

# ----------------------------
# 2. Connect to Cosmos DB
# ----------------------------
client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)
database = client.get_database_client(DATABASE_NAME)
source_container = database.get_container_client(SOURCE_CONTAINER_NAME)
prediction_container = database.get_container_client(PREDICTION_CONTAINER_NAME)

# ----------------------------
# 3. Load Data from Cosmos DB
# ----------------------------
data = list(source_container.read_all_items())
df = pd.DataFrame(data)

if df.empty:
    raise ValueError("No data found in vehicle_data container.")

# ----------------------------
# 4. Preprocess Features
# ----------------------------
df.dropna(inplace=True)
df["avg_power"] = df["kWhDelivered"] / df["chargingDuration"].replace(0, np.nan)
df["connection_end_time"] = df["connectionTime_decimal"] + df["chargingDuration"]

# ----------------------------
# 5. Load Gradient Boosting Model
# ----------------------------
model = joblib.load("gradient_boosting_model.pkl")

# ----------------------------
# 6. Make Predictions
# ----------------------------
features = ["connectionTime_decimal", "chargingDuration", "avg_power", "connection_end_time"]
X = df[features]
df["predicted_kWh"] = model.predict(X)

# ----------------------------
# 7. Clean Old Predictions
# ----------------------------
print("🧹 Deleting old predictions...")
deleted = 0
for item in prediction_container.read_all_items():
    try:
        prediction_container.delete_item(item["id"], partition_key=item["dayIndicator"])
        deleted += 1
    except Exception as e:
        print(f"Failed to delete item {item.get('id', 'UNKNOWN')}: {e}")
print(f"Deleted {deleted} old predictions.")

# ----------------------------
# 8. Insert New Predictions
# ----------------------------
print("Uploading new predictions...")

# Ensure each record has a unique ID
df["id"] = [str(uuid.uuid4()) for _ in range(len(df))]

# If `dayIndicator` is missing from any row, you MUST fix it
if "dayIndicator" not in df.columns:
    raise ValueError("'dayIndicator' column is required for partition key.")

records = df.to_dict(orient="records")
for record in records:
    try:
        prediction_container.upsert_item(record)
    except Exception as e:
        print(f"Failed to insert item: {e}")

print(f"Successfully inserted {len(records)} new prediction records.")

# ----------------------------
# 9. Upload Model to Blob Storage (AFTER predictions are done)
# ----------------------------
def upload_model_to_blob():
    """
    Upload the model to blob storage after predictions are completed
    """
    try:
        blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING)
        
        # Create container for models (if it doesn't exist)
        try:
            blob_service_client.create_container(BLOB_CONTAINER_NAME)
            print(f"✅ Created container: {BLOB_CONTAINER_NAME}")
        except Exception:
            print(f"📁 Container {BLOB_CONTAINER_NAME} already exists")
        
        # Serialize model to bytes
        print("🔄 Serializing model for backup...")
        buffer = io.BytesIO()
        joblib.dump(model, buffer)
        model_bytes = buffer.getvalue()
        print(f"📦 Model serialized, size: {len(model_bytes)} bytes")
        
        # Upload model to blob storage
        blob_client = blob_service_client.get_blob_client(
            container=BLOB_CONTAINER_NAME, 
            blob=MODEL_BLOB_NAME
        )
        
        print("⬆️ Uploading model to blob storage...")
        blob_client.upload_blob(model_bytes, overwrite=True)
        
        print(f"✅ Model uploaded successfully to blob storage!")
        print(f"📂 Container: {BLOB_CONTAINER_NAME}")
        print(f"📄 Blob name: {MODEL_BLOB_NAME}")
        
        # Verify the upload
        blob_properties = blob_client.get_blob_properties()
        print(f"✅ Verification: Blob size = {blob_properties.size} bytes")
        print(f"📅 Last modified: {blob_properties.last_modified}")
        
    except Exception as e:
        print(f"❌ Error uploading model to blob: {e}")
        # Don't raise - this is just a backup, don't fail the whole process

# Upload model to blob storage as backup
print("📤 Backing up model to blob storage...")
upload_model_to_blob()

print("🎉 Process completed successfully!")