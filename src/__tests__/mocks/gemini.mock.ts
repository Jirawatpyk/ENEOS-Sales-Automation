/**
 * Gemini AI Mocks
 */

import { vi } from 'vitest';
import { CompanyAnalysis } from '../../types/index.js';

// Mock company analysis response
export const mockCompanyAnalysis: CompanyAnalysis = {
  industry: 'อุตสาหกรรมก่อสร้าง',
  companyType: 'ผู้รับเหมาก่อสร้างขนาดใหญ่',
  talkingPoint: 'SCG มีเครื่องจักรหนักจำนวนมาก น้ำมันเครื่อง ENEOS จะช่วยยืดอายุการใช้งานและลดค่าบำรุงรักษา',
  website: 'https://scg.com',
  registeredCapital: '50,000,000 บาท',
  keywords: ['construction', 'heavy-machinery', 'industrial'],
};

// Mock default analysis (fallback)
export const mockDefaultAnalysis: CompanyAnalysis = {
  industry: 'ไม่ระบุ',
  companyType: 'ไม่ระบุ',
  talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงจากญี่ปุ่น',
  website: null,
  registeredCapital: null,
  keywords: ['B2B'],
};

// Create mock Gemini service
export function createMockGeminiService() {
  return {
    analyzeCompany: vi.fn().mockResolvedValue(mockCompanyAnalysis),
    generateSalesMessage: vi.fn().mockResolvedValue('ข้อความขายสำหรับบริษัทของท่าน'),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 500 }),
  };
}
