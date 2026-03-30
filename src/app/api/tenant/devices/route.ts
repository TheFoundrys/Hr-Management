import { NextResponse } from 'next/server';
import { tenantManager } from '@/lib/multiTenant';
import { deviceManager } from '@/lib/universalDeviceIntegration';

export async function POST(request: Request) {
  try {
    const { tenantId, deviceData } = await request.json();

    if (!tenantId || !deviceData) {
      return NextResponse.json({
        error: 'Tenant ID and device data are required'
      }, { status: 400 });
    }

    // Add device to tenant
    const device = await tenantManager.addDevice(tenantId, {
      tenantId,
      deviceId: deviceData.deviceId,
      deviceType: deviceData.deviceType,
      deviceIp: deviceData.deviceIp,
      deviceName: deviceData.deviceName,
      location: deviceData.location,
      status: 'active',
      settings: deviceData.settings || {
        syncInterval: 30,
        autoSync: true,
        timezone: 'UTC',
        port: 80,
        protocol: 'http'
      }
    });

    // Try to connect to device
    try {
      const connected = await deviceManager.connectDevice(device);
      if (connected) {
        console.log(`✅ Device ${device.deviceId} connected successfully`);
      }
    } catch (error) {
      console.log(`⚠️ Could not connect to device ${device.deviceId}:`, error instanceof Error ? error.message : String(error));
    }

    return NextResponse.json({
      success: true,
      device: {
        id: device.id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        deviceIp: device.deviceIp,
        deviceName: device.deviceName,
        location: device.location,
        status: device.status
      }
    });

  } catch (error) {
    console.error('Device addition error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to add device'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({
        error: 'Tenant ID is required'
      }, { status: 400 });
    }

    const deviceStatus = await deviceManager.getTenantDeviceStatus(tenantId);

    return NextResponse.json({
      success: true,
      devices: deviceStatus
    });

  } catch (error) {
    console.error('Failed to get device status:', error);
    return NextResponse.json({
      error: 'Failed to get device status'
    }, { status: 500 });
  }
}
