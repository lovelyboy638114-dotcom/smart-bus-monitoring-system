import React, { useState } from 'react';
import CameraMock from '../../components/CameraMock';
import { useApp } from '../../context/AppContext';
import { 
  Shield, Activity, Compass, AlertOctagon, MonitorDot, Plus, 
  X, Clipboard, Printer, Download, Key, CheckCircle, UserPlus 
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

const DriverAnalysis = () => {
  const { buses, setBuses } = useApp();
  
  // Registration Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    driverId: '',
    licenseNo: '',
    experienceYears: '',
    phone: '',
    busRoute: ''
  });

  // Success credentials display overlay state
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  };

  const getDriverPreviewEmail = () => {
    const normName = normalizeText(newDriver.name);
    const normId = normalizeText(newDriver.driverId);
    if (!normName || !normId) return 'Will be generated...';
    return `${normName}${normId}.driver@happyjourney.ai`;
  };

  const getDriverPreviewPassword = () => {
    const cleanedName = newDriver.name.replace(/[^a-zA-Z0-9]/g, '');
    const cleanedId = newDriver.driverId.replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanedName || !cleanedId) return 'Will be generated...';
    return `${cleanedName}@${cleanedId}`;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/register/driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'admin'
        },
        body: JSON.stringify(newDriver)
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        // Refresh buses (which will include the driver profile assignment)
        const refreshResponse = await fetch(`${API_BASE_URL}/api/buses`);
        const refreshedBuses = await refreshResponse.json();
        setBuses(refreshedBuses);

        setCreatedCredentials(resJson.data);
        setIsAddModalOpen(false);
        setNewDriver({
          name: '',
          driverId: '',
          licenseNo: '',
          experienceYears: '',
          phone: '',
          busRoute: ''
        });
      } else {
        alert(resJson.message || 'Driver registration failed.');
      }
    } catch (err) {
      alert('Failed to reach backend API to register driver.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResetPassword = async (username) => {
    if (!window.confirm(`Are you sure you want to reset password for driver ${username}?`)) return;
    setResetLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/accounts/${username}/reset-password`, {
        method: 'POST',
        headers: {
          'X-User-Role': 'admin'
        }
      });
      const resJson = await response.json();
      if (response.ok && resJson.success) {
        setCreatedCredentials({
          driver_email: resJson.data.username,
          driver_temp_pass: resJson.data.temp_password,
          driver_pdf: resJson.data.pdf_path,
          isReset: true
        });
      } else {
        alert(resJson.message || 'Reset failed.');
      }
    } catch (err) {
      alert('Failed to reset credentials. Connect to the backend.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  const handlePrint = (creds) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Driver Access Credentials</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h2 { color: #1d4ed8; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .val { font-size: 16px; margin-top: 4px; font-family: monospace; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>Secure Driver Portal Credentials</h2>
          <div class="section">
            <div class="label">Access Username / Email</div>
            <div class="val">${creds.driver_email}</div>
          </div>
          <div class="section">
            <div class="label">Temporary Passphrase</div>
            <div class="val">${creds.driver_temp_pass}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadTxt = (creds) => {
    const content = `=== DRIVER PORTAL REGISTRATION SUMMARY ===\nDriver Email: ${creds.driver_email}\nTemporary Pass: ${creds.driver_temp_pass}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${creds.driver_email}_credentials.txt`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-6 p-6 font-sans">
      
      {/* View Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none">
            Computer Vision Telematics
          </span>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-1">Driver Behavior Analysis Console</h2>
          <p className="text-xs text-slate-500 font-medium">
            Real-time driver fatigue, visual distraction, and seatbelt telematics monitoring using Computer Vision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Enroll Driver
          </button>
          <div className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm text-xs font-bold uppercase shrink-0">
            <MonitorDot className="w-4 h-4 text-blue-600 animate-pulse" />
            <span>Overall CV Feeds Connected</span>
          </div>
        </div>
      </div>

      {/* Grid rendering all three bus driver cameras side-by-side (connected overall CV) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {buses.map((bus) => (
          <div key={bus.id} className="flex flex-col gap-3">
            <div className="bg-slate-50 p-3.5 border border-slate-150 rounded-xl flex justify-between items-center shadow-inner">
              <div>
                <h4 className="text-xs font-bold text-slate-850 font-mono leading-none">{bus.id}</h4>
                <span className="text-[9px] text-slate-450 uppercase font-extrabold block mt-1 tracking-wider">
                  Driver: {bus.driver}
                </span>
              </div>
              <span className="px-2 py-0.5 text-[8.5px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                ✓ Cam Connected
              </span>
            </div>
            
            <CameraMock 
              busId={bus.id} 
              driverName={bus.driver} 
              defaultSafetyScore={bus.id === "TN38AB1234" ? 85 : bus.id === "TN38CD5678" ? 92 : 88} 
              hideSimulators={true}
            />
          </div>
        ))}
      </div>

      {/* Driver Registry Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-soft mt-6">
        <div className="p-5 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Verified Drivers Registry</h3>
          <p className="text-[10px] text-slate-400 font-medium">Verify driver background checks, verified license IDs, and total years of transit experience:</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Driver Name</th>
                <th className="py-4 px-6">Vehicle / Route</th>
                <th className="py-4 px-6">License Number</th>
                <th className="py-4 px-6">Experience</th>
                <th className="py-4 px-6">Verification API Status</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {buses.map((busItem) => {
                // Construct a generated driver username dynamically to support reset logic
                const prefix = busItem.driver ? busItem.driver.replace(/\s+/g, '').toLowerCase() : '';
                const driver_email = busItem.driver ? `${prefix}drv${busItem.id.slice(-3).toLowerCase()}@happyjourney.ai` : '';
                
                return (
                  <tr key={busItem.id} className="hover:bg-slate-50/20 transition-smooth">
                    <td className="py-3.5 px-6 text-slate-900">{busItem.driver}</td>
                    <td className="py-3.5 px-6 font-mono text-[10px] text-slate-550">{busItem.id} ({busItem.route})</td>
                    <td className="py-3.5 px-6 font-mono text-slate-655">{busItem.driverLicense || "Pending Signup"}</td>
                    <td className="py-3.5 px-6">{busItem.driverExperience ? `${busItem.driverExperience} Years` : "N/A"}</td>
                    <td className="py-3.5 px-6">
                      {busItem.driverLicense ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase">
                          ✓ API Verified (Active)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase animate-pulse">
                          ⌛ Awaiting Verification
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {busItem.driverLicense && (
                        <button
                          disabled={resetLoading}
                          onClick={() => handleResetPassword(driver_email)}
                          className="px-2.5 py-1 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-smooth flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider inline-flex"
                        >
                          <Key className="w-3 h-3" /> Reset Password
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Driver Dialog Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" /> Secure Driver Enrollment
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Credentials will be generated automatically and audits logged.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 flex flex-col gap-4 text-xs">
              
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={newDriver.name} 
                  onChange={e => setNewDriver({...newDriver, name: e.target.value})}
                  placeholder="e.g. Ramesh Kumar"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Driver ID *</label>
                  <input 
                    type="text" 
                    required
                    value={newDriver.driverId} 
                    onChange={e => setNewDriver({...newDriver, driverId: e.target.value})}
                    placeholder="e.g. DR001"
                    className="border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">License Number *</label>
                  <input 
                    type="text" 
                    required
                    value={newDriver.licenseNo} 
                    onChange={e => setNewDriver({...newDriver, licenseNo: e.target.value})}
                    placeholder="e.g. DL-99238"
                    className="border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Experience (Years) *</label>
                  <input 
                    type="number" 
                    required
                    value={newDriver.experienceYears} 
                    onChange={e => setNewDriver({...newDriver, experienceYears: e.target.value})}
                    placeholder="e.g. 5"
                    className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600">Phone Number *</label>
                  <input 
                    type="text" 
                    required
                    value={newDriver.phone} 
                    onChange={e => setNewDriver({...newDriver, phone: e.target.value})}
                    placeholder="e.g. +1-555-8888"
                    className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Assigned Bus Route (Dropdown Selection) *</label>
                <select 
                  required
                  value={newDriver.busRoute}
                  onChange={e => setNewDriver({...newDriver, busRoute: e.target.value})}
                  className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="">Select bus vehicle...</option>
                  {buses.map(bus => (
                    <option key={bus.id} value={bus.id}>{bus.id} - {bus.route}</option>
                  ))}
                </select>
              </div>

              {/* Credentials Preview Panel */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-2 flex flex-col gap-2.5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none">
                  Security Credentials Preview
                </span>
                <div className="text-xs">
                  <span className="font-bold text-slate-500 block">Generated Driver Email ID</span>
                  <code className="text-blue-700 font-mono font-bold block truncate">{getDriverPreviewEmail()}</code>
                  <span className="font-bold text-slate-500 block mt-1.5">Temporary Passphrase</span>
                  <code className="text-slate-800 font-mono font-bold block">{getDriverPreviewPassword()}</code>
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={registerLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold uppercase shadow-sm"
                >
                  {registerLoading ? 'Provisioning...' : 'Complete Registration'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Success Credentials Display Overlay */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-sm flex flex-col overflow-hidden animate-smooth text-xs">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4" /> {createdCredentials.isReset ? "Password Reset Successful" : "Driver Registered Successfully"}
              </h3>
              <button 
                onClick={() => setCreatedCredentials(null)}
                className="p-1 rounded-lg hover:bg-blue-700 text-white/80 transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold uppercase text-[10px] tracking-wider">Account Active</h4>
                  <p className="font-semibold text-[11px] leading-normal mt-0.5">
                    {createdCredentials.isReset ? "New driver credentials have been compiled successfully." : "Driver login credentials have been provisioned in the central directory."}
                  </p>
                </div>
              </div>

              <div className="p-4 border border-slate-150 rounded-xl flex flex-col gap-2 bg-slate-50/50">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">Login Account Credentials</span>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Username / Email:</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="font-mono font-bold text-slate-800">{createdCredentials.driver_email}</span>
                    <button 
                      onClick={() => handleCopyClipboard(createdCredentials.driver_email)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-smooth"
                      title="Copy Username"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Temporary Password:</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="font-mono font-black text-slate-900">{createdCredentials.driver_temp_pass}</span>
                    <button 
                      onClick={() => handleCopyClipboard(createdCredentials.driver_temp_pass)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-smooth"
                      title="Copy Password"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Document download triggers */}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handlePrint(createdCredentials)}
                  className="flex-1 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
                </button>
                <button
                  onClick={() => handleDownloadTxt(createdCredentials)}
                  className="flex-1 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> TXT
                </button>
                {(createdCredentials.driver_pdf || createdCredentials.pdf_path) && (
                  <a
                    href={`${API_BASE_URL}${createdCredentials.driver_pdf || createdCredentials.pdf_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm text-center"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverAnalysis;
