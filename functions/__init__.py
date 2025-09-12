import logging
import json
import azure.functions as func
import uuid
import os

# Try to import dependencies with error handling
try:
    import pandas as pd
    import numpy as np
    import joblib
    import io
    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient, BlobClient
    logging.info("✅ All dependencies imported successfully")
except ImportError as e:
    logging.error(f"❌ Import error: {e}")
    # Set flags to disable ML functionality if imports fail
    DEPENDENCIES_AVAILABLE = False
else:
    DEPENDENCIES_AVAILABLE = True

# Global variables for model and connections
model = None
blob_service_client = None

def load_model_from_blob():
    """Load the trained model from Azure Blob Storage using DefaultAzureCredential"""
    global model, blob_service_client
    
    if not DEPENDENCIES_AVAILABLE:
        logging.error("❌ Dependencies not available - cannot load model")
        return None
    
    if model is not None:
        return model
    
    try:
        # Get storage account name from environment variables
        storage_account_name = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
        container_name = os.environ.get('MODEL_CONTAINER_NAME', 'models')
        blob_name = os.environ.get('MODEL_BLOB_NAME', 'gradient_boosting_model.pkl')
        
        if not storage_account_name:
            logging.error("❌ AZURE_STORAGE_ACCOUNT_NAME not found in environment variables")
            # Fallback to connection string method
            return load_model_with_connection_string()
        
        # Use DefaultAzureCredential for authentication
        credential = DefaultAzureCredential()
        
        # Option 1: Using BlobClient directly (more efficient for single blob operations)
        account_url = f"https://{storage_account_name}.blob.core.windows.net"
        blob_client = BlobClient(
            account_url=account_url,
            container_name=container_name,
            blob_name=blob_name,
            credential=credential
        )
        
        logging.info(f"✅ Attempting to load model from {account_url}/{container_name}/{blob_name}")
        
        # Download and load model
        model_data = blob_client.download_blob().readall()
        model = joblib.load(io.BytesIO(model_data))
        logging.info("✅ Model loaded successfully using DefaultAzureCredential")
        return model
        
    except Exception as e:
        logging.error(f"❌ Error loading model with DefaultAzureCredential: {e}")
        # Fallback to connection string method
        logging.info("🔄 Attempting fallback to connection string method")
        return load_model_with_connection_string()

def load_model_with_connection_string():
    """Fallback method to load model using connection string"""
    global model, blob_service_client
    
    try:
        # Get connection string from environment variables
        blob_connection_string = os.environ.get('AZURE_STORAGE_CONNECTION_STRING')
        
        if not blob_connection_string:
            logging.error("❌ AZURE_STORAGE_CONNECTION_STRING not found in environment variables")
            return None
        
        # Connect to blob storage
        if blob_service_client is None:
            blob_service_client = BlobServiceClient.from_connection_string(blob_connection_string)
            logging.info("✅ Connected to blob storage using connection string")
        
        # Download and load model
        container_name = os.environ.get('MODEL_CONTAINER_NAME', 'models')
        blob_name = os.environ.get('MODEL_BLOB_NAME', 'gradient_boosting_model.pkl')
        
        blob_client = blob_service_client.get_blob_client(
            container=container_name, 
            blob=blob_name
        )
        
        model_data = blob_client.download_blob().readall()
        model = joblib.load(io.BytesIO(model_data))
        logging.info("✅ Model loaded successfully from Blob Storage using connection string")
        return model
        
    except Exception as e:
        logging.error(f"❌ Error loading model with connection string: {e}")
        return None

def make_prediction(message_data):
    """Make prediction using the loaded model"""
    global model  # Add this line to access the global model variable
    
    if not DEPENDENCIES_AVAILABLE:
        logging.warning("⚠️ Dependencies not available - skipping prediction")
        return None
        
    try:
        # Load model if not already loaded
        if model is None:
            model = load_model_from_blob()
        
        if model is None:
            logging.warning("⚠️ Model not available - skipping prediction")
            return None
        
        # Convert message to DataFrame
        df = pd.DataFrame([message_data])
        
        # Preprocess features (same as your training)
        df["avg_power"] = df["kWhDelivered"] / df["chargingDuration"].replace(0, np.nan)
        df["connection_end_time"] = df["connectionTime_decimal"] + df["chargingDuration"]
        
        # Features for prediction
        features = ["connectionTime_decimal", "chargingDuration", "avg_power", "connection_end_time"]
        
        # Check if all required features are present
        missing_features = [f for f in features if f not in df.columns or pd.isna(df[f].iloc[0])]
        if missing_features:
            logging.warning(f"Missing features for prediction: {missing_features}")
            return None
        
        # Make prediction
        X = df[features]
        prediction = model.predict(X)[0]
        
        logging.info(f"🤖 Prediction made: {prediction}")
        return prediction
        
    except Exception as e:
        logging.error(f"❌ Error making prediction: {e}")
        return None

def main(events: func.EventHubEvent, outputDocument: func.Out[func.Document], outputdoc: func.Out[func.Document]):
    logging.info(f"🚀 Function started. Dependencies available: {DEPENDENCIES_AVAILABLE}")
    
    for event in events:
        logging.info("IoT message received")
        try:
            # Parse message from Event Hub
            message = json.loads(event.get_body().decode('utf-8'))
            logging.info(f"Message content: {message}")
            
            # Add a unique ID (required by Cosmos DB)
            message['id'] = str(uuid.uuid4())
            
            # Output original data to vehicle_data container
            outputDocument.set(func.Document.from_dict(message))
            logging.info("✅ Original data sent to vehicle_data container")
            
            # Make prediction using the model (only if dependencies are available)
            prediction = make_prediction(message)
            
            # If prediction successful, save to predictions container
            if prediction is not None:
                # Create prediction document
                prediction_doc = message.copy()  # Copy original data
                prediction_doc['id'] = str(uuid.uuid4())  # New unique ID for prediction
                prediction_doc['predicted_kWh'] = float(prediction)
                
                # Output prediction to vehicle_predictions container
                outputdoc.set(func.Document.from_dict(prediction_doc))
                logging.info(f"✅ Prediction saved: {prediction}")
            else:
                logging.warning("⚠️ No prediction made - only original data saved")
            
        except Exception as e:
            logging.error(f"❌ Error processing message: {e}")
            # Still try to save original data even if prediction fails
            try:
                if 'message' in locals() and message:
                    if 'id' not in message:
                        message['id'] = str(uuid.uuid4())
                    outputDocument.set(func.Document.from_dict(message))
                    logging.info("✅ Original data saved despite error")
                    # Don't re-raise if we successfully saved the original data
                    logging.info("⚠️ Function completed with partial success")
                else:
                    # Only re-raise if we couldn't save anything
                    raise
            except Exception as save_error:
                logging.error(f"❌ Failed to save original data: {save_error}")
                raise