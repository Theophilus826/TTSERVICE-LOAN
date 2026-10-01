
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  startFaceVerification,
} from "../services/kycApi";

// =========================================================
// TYPES
// =========================================================

interface FaceVerificationStepProps {
  isVerified?: boolean;
  onVerified: () => void;
}

// =========================================================
// COMPONENT
// =========================================================

const FaceVerificationStep: React.FC<
  FaceVerificationStepProps
> = ({
  isVerified = false,
  onVerified,
}) => {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [cameraStarted, setCameraStarted] =
    useState(false);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  // =======================================================
  // STOP CAMERA
  // =======================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  // =======================================================
  // CLEANUP
  // =======================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // =======================================================
  // START CAMERA
  // =======================================================

  const startCamera = async () => {
    try {
      setError(null);
      setMessage(null);

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser.",
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 720,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setCameraStarted(true);
    } catch (err: any) {
      console.error(
        "Camera error:",
        err,
      );

      setError(
        err?.message ||
          "Unable to access your camera. Please allow camera permission and try again.",
      );

      setCameraStarted(false);
    }
  };

  // =======================================================
  // CAPTURE SELFIE
  // =======================================================

  const captureSelfie = (): string | null => {
    const video =
      videoRef.current;

    if (!video) {
      return null;
    }

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return null;
    }

    const width =
      video.videoWidth || 720;

    const height =
      video.videoHeight || 720;

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return null;
    }

    /*
     * Mirror the captured image so it matches
     * what the user sees in the camera preview.
     */
    context.translate(width, 0);
    context.scale(-1, 1);

    context.drawImage(
      video,
      0,
      0,
      width,
      height,
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.85,
    );
  };

  // =======================================================
  // VERIFY FACE
  // =======================================================

  const handleVerification = async () => {
    if (isVerifying) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!cameraStarted) {
      setError(
        "Please start your camera first.",
      );

      return;
    }

    const selfie =
      captureSelfie();

    if (!selfie) {
      setError(
        "Unable to capture your selfie. Please make sure your face is visible and try again.",
      );

      return;
    }

    try {
      setIsVerifying(true);

      setMessage(
        "Verifying your face. Please wait...",
      );

      const result =
        await startFaceVerification(
          selfie,
        );

      if (
        result?.faceVerificationStatus ===
        "verified"
      ) {
        stopCamera();

        setMessage(
          "Face verification successful.",
        );

        onVerified();

        return;
      }

      if (
        result?.faceVerificationStatus ===
        "pending"
      ) {
        stopCamera();

        setMessage(
          "Face verification is in progress. Please refresh your verification status.",
        );

        return;
      }

      setError(
        result?.faceVerificationReason ||
          "Face verification failed. Please try again.",
      );
    } catch (err: any) {
      console.error(
        "Face verification error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Face verification failed. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // =======================================================
  // ALREADY VERIFIED
  // =======================================================

  if (isVerified) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="font-semibold text-green-800">
            Face verification complete
          </h3>

          <p className="mt-1 text-sm text-green-700">
            Your identity has been successfully
            verified.
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Face Verification
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Take a clear selfie so we can verify
          your identity.
        </p>
      </div>

      {/* =================================================
          CAMERA
      ================================================= */}

      <div className="overflow-hidden rounded-xl border bg-black">
        {cameraStarted ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-square w-full object-cover"
            style={{
              transform: "scaleX(-1)",
            }}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-gray-100 p-6 text-center">
            <div>
              <p className="font-medium text-gray-700">
                Camera is not active
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Start your camera to continue.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          MESSAGE
      ================================================= */}

      {message && !error && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      {/* =================================================
          ACTIONS
      ================================================= */}

      {!cameraStarted ? (
        <button
          type="button"
          onClick={startCamera}
          disabled={isVerifying}
          className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Camera
        </button>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleVerification}
            disabled={isVerifying}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying
              ? "Verifying..."
              : "Verify My Face"}
          </button>

          <button
            type="button"
            onClick={stopCamera}
            disabled={isVerifying}
            className="w-full rounded-lg border px-4 py-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop Camera
          </button>
        </div>
      )}

      {/* =================================================
          INSTRUCTIONS
      ================================================= */}

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700">
          For best results:
        </p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Use good lighting.</li>
          <li>Look directly at the camera.</li>
          <li>Keep your whole face visible.</li>
          <li>Remove anything covering your face.</li>
        </ul>
      </div>
    </div>
  );
};

export default FaceVerificationStep;

