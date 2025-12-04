import React from 'react';
import { PatientLicenseData } from '../types';

interface LicenseCardProps {
  data: PatientLicenseData;
  onClose: () => void;
}

export const LicenseCard: React.FC<LicenseCardProps> = ({ data, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden print:fixed print:inset-0 print:w-full print:max-w-none print:h-screen print:rounded-none">
        
        {/* Header with Pattern */}
        <div className="bg-[#0f766e] p-6 text-white text-center relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
           <h2 className="text-2xl font-bold font-serif relative z-10 mb-1">رخصة طبية شرعية</h2>
           <p className="text-sm opacity-90 relative z-10">Medical-Religious Exemption Card</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="border-b-2 border-dashed border-gray-200 pb-4">
             <p className="text-gray-500 text-sm mb-1">الطبيب المعالج / Attending Physician</p>
             <p className="text-lg font-bold text-gray-800">{data.doctorName}</p>
          </div>

          <div className="border-b-2 border-dashed border-gray-200 pb-4">
             <p className="text-gray-500 text-sm mb-1">اسم المريض / Patient Name</p>
             <p className="text-xl font-bold text-gray-900">{data.patientName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <p className="text-gray-500 text-sm mb-1">التاريخ / Date</p>
               <p className="font-medium">{data.date}</p>
            </div>
            <div>
               <p className="text-gray-500 text-sm mb-1">التشخيص / Diagnosis</p>
               <p className="font-medium text-red-600">{data.diagnosis}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-xs mb-2 font-bold">الرأي الشرعي الطبي / Ruling</p>
            <p className="text-gray-800 leading-relaxed text-sm">
              {data.rulingSummary}
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-400">تطبيق الطبيب الفقيه</span>
              <span className="text-xs font-bold text-[#0f766e]">معتمد استناداً للفتاوى الرسمية</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex gap-3 no-print">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            إغلاق
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 px-4 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d655e] font-medium shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            طباعة البطاقة
          </button>
        </div>
      </div>
    </div>
  );
};
