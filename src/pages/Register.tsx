import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { Eye, EyeOff } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const navigate = useNavigate();

  const { user, initializing, isAuthenticated, register } = useAuth();

  // =========================================================
  // FORM STATE
  // =========================================================

  const [formData, setFormData] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Controls only the registration request.
  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // AUTHENTICATION REDIRECT
  // =========================================================

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    navigate("/dashboard", {
      replace: true,
    });
  }, [isAuthenticated, user, navigate]);

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    /*
     * PIN fields:
     *
     * - numbers only
     * - maximum 4 digits
     */

    if (name === "password" || name === "confirmPassword") {
      const numericValue = value.replace(/\D/g, "").slice(0, 4);

      setFormData((previous) => ({
        ...previous,
        [name]: numericValue,
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    // NAME
    if (!formData.name.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    // CONTACT
    // EMAIL REQUIRED
    if (!formData.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // PHONE REQUIRED
    if (!formData.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    // EMAIL
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      toast.error("Please enter a valid email address");
      return;
    }

    // PHONE
    if (formData.phone.trim()) {
      if (!/^0\d{10}$/.test(formData.phone)) {
        toast.error(
          "Please enter a valid Nigerian phone number, e.g. 08012345678",
        );
        return;
      }
    }

    // PIN
    if (!/^\d{4}$/.test(formData.password)) {
      toast.error("PIN must contain exactly 4 digits");
      return;
    }

    // CONFIRM PIN
    if (!/^\d{4}$/.test(formData.confirmPassword)) {
      toast.error("Confirm PIN must contain exactly 4 digits");
      return;
    }

    // MATCH
    if (formData.password !== formData.confirmPassword) {
      toast.error("PINs do not match");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      toast.success("Account created successfully!");

      navigate("/dashboard");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // INITIAL SESSION CHECK
  // =========================================================

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />

          <h2 className="text-xl font-semibold text-gray-800">Loading</h2>

          <p className="mt-2 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* BRAND */}

        <h1 className="mb-2 text-center text-3xl font-bold text-orange-500">
          Lovest
        </h1>

        <p className="mb-8 text-center text-gray-500">Create your account</p>

        {/* FORM */}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* NAME */}

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={onChange}
              autoComplete="name"
              disabled={submitting}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* PHONE */}

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="08012345678"
              value={formData.phone}
              onChange={onChange}
              autoComplete="tel"
              inputMode="tel"
              disabled={submitting}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Enter a Nigerian number, e.g. 08012345678
            </p>
          </div>

          {/* EMAIL */}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={onChange}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={submitting}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* CONTACT INFO */}

          <p className="text-center text-xs text-gray-500">
            Email address and phone number are required.
          </p>

          {/* PIN */}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              4-Digit PIN
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="Enter 4-digit PIN"
                value={formData.password}
                onChange={onChange}
                autoComplete="new-password"
                disabled={submitting}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                onClick={() => setShowPassword((previous) => !previous)}
                disabled={submitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Your PIN must contain exactly 4 digits.
            </p>
          </div>

          {/* CONFIRM PIN */}

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirm PIN
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="Confirm 4-digit PIN"
                value={formData.confirmPassword}
                onChange={onChange}
                autoComplete="new-password"
                disabled={submitting}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide PIN" : "Show PIN"}
                onClick={() => setShowConfirmPassword((previous) => !previous)}
                disabled={submitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* LOGIN */}

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            disabled={submitting}
            className="font-semibold text-orange-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
