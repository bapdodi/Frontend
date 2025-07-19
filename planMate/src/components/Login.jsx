// components/Login.jsx
import React, { useState, useEffect } from "react";
import { useApiClient } from "../assets/hooks/useApiClient";

export default function Login({
  isOpen,
  onClose,
  onPasswordFindOpen,
  onSignupOpen,
  onLoginSuccess,
}) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState("");

  // API 클라이언트 훅 사용
  const { login, isLoading, error } = useApiClient();

  // 모달이 열릴 때마다 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({ email: "", password: "" });
      setFormError("");
    }
  }, [isOpen]);

  // 입력값 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError("");
  };

  // 유효성 검증
  const validateForm = () => {
    if (!formData.email.trim()) {
      setFormError("이메일을 입력해주세요.");
      return false;
    }
    if (!formData.password.trim()) {
      setFormError("비밀번호를 입력해주세요.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError("올바른 이메일 형식을 입력해주세요.");
      return false;
    }
    return true;
  };

  // 로그인 처리
  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      const result = await login(formData.email, formData.password);

      // 로그인 성공 콜백 호출
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }

      // 모달 닫기
      onClose();
    } catch (err) {
      // 에러는 useApiClient에서 자동으로 설정됨
      console.error("로그인 실패:", err);
    }
  };

  // Enter 키로 로그인
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
          disabled={isLoading}
        >
          ×
        </button>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">
          로그인
        </h1>

        <div className="space-y-6">
          {/* 에러 메시지 표시 */}
          {(error || formError) && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError || error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder="이메일을 입력하세요"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-[6rem] py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "로그인"
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-8 text-sm text-gray-500">
          <button
            className="hover:text-gray-700 disabled:cursor-not-allowed"
            onClick={onPasswordFindOpen}
            disabled={isLoading}
          >
            비밀번호 찾기
          </button>
          <button
            className="hover:text-gray-700 disabled:cursor-not-allowed"
            onClick={onSignupOpen}
            disabled={isLoading}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
