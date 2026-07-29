"use client";
import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f0fdf4', fontFamily: '-apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white', padding: '40px', borderRadius: '20px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '400px'
      }}>
        <div style={{fontSize: '60px', marginBottom: '20px'}}>🔐</div>
        <h1 style={{color: '#166534', fontSize: '20px', marginBottom: '20px'}}>ENIC SYSTEM LOGIN</h1>
        <p style={{color: '#64748b', fontSize: '15px', marginBottom: '30px', lineHeight: '1.6'}}>
          Vui lòng đăng nhập bằng tài khoản nội bộ để truy cập vào hệ thống.
        </p>
        <button 
          onClick={() => signIn('google', { callbackUrl: '/' })}
          style={{
            background: '#2563eb', color: 'white', padding: '14px 24px', 
            border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, 
            cursor: 'pointer', width: '100%', textTransform: 'uppercase'
          }}
        >
          Đăng nhập bằng Google
        </button>
      </div>
    </div>
  );
}
