import time
import json
import csv
import os
from azure.iot.device import IoTHubDeviceClient, Message
from dotenv import load_dotenv

CSV_FILE = "vehicle_data.csv"
STATE_FILE = "row_index.txt"


load_dotenv()  # Loads variables from .env file
CONNECTION_STRING = os.getenv("IOTHUB_CONN")

device_client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)

# Load last row index
def load_last_index():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return int(f.read())
    return 0

# Save current row index
def save_current_index(index):
    with open(STATE_FILE, 'w') as f:
        f.write(str(index))

# Start reading from CSV
start_index = load_last_index()

with open(CSV_FILE, 'r') as f:
    reader = list(csv.DictReader(f))  # convert to list to allow indexing
    for i in range(start_index, len(reader)):
        row = reader[i]
        message = {
            "connectionTime_decimal": float(row["connectionTime_decimal"]),
            "chargingDuration": float(row["chargingDuration"]),
            "kWhDelivered": float(row["kWhDelivered"]),
            "dayIndicator": row["dayIndicator"]
        }

        msg_json = json.dumps(message)
        print(f"Sending row {i}: {msg_json}")
        device_client.send_message(Message(msg_json))

        save_current_index(i + 1)  # save index of the next row to send
        time.sleep(2)

device_client.disconnect()
