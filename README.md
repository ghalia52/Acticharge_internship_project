# 🚗⚡ ActiCharge – Smart Grid for Connected Vehicles

## 📌 Project Overview

With the rapid adoption of electric vehicles, managing and predicting energy consumption has become a major challenge.
**ActiCharge** is a cloud-based IoT + Machine Learning system designed to:

1. Collect and process real-time vehicle data.
2. Predict vehicle energy consumption with high accuracy.
3. Enable businesses to make data-driven decisions for optimized operations.

---

## 🏗️ Solution Architecture

1. **Data Ingestion**

   * Vehicle data from **CSV** or real-time IoT devices.
   * Published via **MQTT** to **Azure IoT Hub**.
   * Processed by **Azure Functions** (serverless).
   * Stored in **Cosmos DB** for scalable access.

2. **Machine Learning**

   * Built and trained in **Azure ML**.
   * Model: **Gradient Boosting** for energy prediction.
   * Performance: RMSE = **0.337**, Test R² = **0.997**.

3. **Results & Dashboard**

   * **Azure App Service** hosts a **Node.js backend** and **React frontend**.
   * Provides a user-friendly dashboard for predictions and analytics.
