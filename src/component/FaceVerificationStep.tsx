
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  startFaceVerification,
} from "../services/kycApi";

interface FaceVerificationStepProps {
  isVerified?: boolean;
  onVerified: () => void;
}

const FaceVerificationStep: React.FC<
  FaceVerificationStepProps
> = ({
  isVerified = false,
  onVerified,
}) => {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const streamRef =
    useRef<MediaStream | null>(
      null,
    );

  const [
    cameraStarted,
    setCameraStarted,
  ] = useState(false);

  const [
    verifying,
    setVerifying,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  // =========================================================
  // STOP CAMERA
  // =========================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }
    };
  }, []);

  // =========================================================
  // START CAMERA
  // =========================================================

  const startCamera = async () => {
    setError(null);
    setMessage(null);

    try {
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
        "❌ CAMERA ERROR:",
        err,
      );

      setError(
        err?.message ||
          "Unable to access your camera. Please allow camera permission and try again.",
      );
    }
  };

  // =========================================================
  // CAPTURE SELFIE AS BLOB
  // =========================================================

  const captureSelfie = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (!video || !canvas) {
        resolve(null);
        return;
      }

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        resolve(null);
        return;
      }

      canvas.width =
        video.videoWidth;

      canvas.height =
        video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.9,
      );
    });
  };

  // =========================================================
  // UPLOAD SELFIE
  // =========================================================

  const verifyFace = async () => {
    setError(null);
    setMessage(null);

    const selfieBlob =
      await captureSelfie();

    if (!selfieBlob) {
      setError(
        "Unable to capture your selfie. Please make sure your camera is active and try again.",
      );

      return;
    }

    setVerifying(true);

    try {
      // -------------------------------------------------------
      // CREATE IMAGE FILE
      // -------------------------------------------------------

      const selfieFile =
        new File(
          [
            selfieBlob,
          ],
          `selfie-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          },
        );

      // -------------------------------------------------------
      // CREATE MULTIPART FORM DATA
      // -------------------------------------------------------

      const formData =
        new FormData();

      formData.append(
        "selfie",
        selfieFile,
      );

      // -------------------------------------------------------
      // UPLOAD TO BACKEND
      // -------------------------------------------------------

      const response =
        await startFaceVerification(
          formData,
        );

      console.log(
        "=================================",
      );

      console.log(
        "📸 SELFIE UPLOAD RESPONSE",
      );

      console.log(
        response,
      );

      console.log(
        "=================================",
      );

      const data =
        response?.data;

      const status =
        data?.faceVerificationStatus ||
        data?.status ||
        "verified";

      // -------------------------------------------------------
      // SUCCESS
      // -------------------------------------------------------

      if (
        status === "verified"
      ) {
        stopCamera();

        setMessage(
          "Your selfie was uploaded successfully.",
        );

        onVerified();

        return;
      }

      // -------------------------------------------------------
      // FAILED
      // -------------------------------------------------------

      if (
        status === "failed"
      ) {
        setError(
          data?.faceVerificationReason ||
            response?.message ||
            "Unable to save your selfie. Please try again.",
        );

        return;
      }

      // -------------------------------------------------------
      // UNEXPECTED STATUS
      // -------------------------------------------------------

      setError(
        "Your selfie could not be completed. Please try again.",
      );
    } catch (err: any) {
      console.error(
        "❌ SELFIE UPLOAD ERROR:",
        err,
      );

      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Unable to upload your selfie. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  // =========================================================
  // ALREADY VERIFIED
  // =========================================================

  if (isVerified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-xl font-semibold text-green-700">
          Selfie Complete
        </h2>

        <p className="mt-2 text-sm text-green-600">
          Your selfie has been successfully
          submitted.
        </p>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">
        Take Your Selfie
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Take a clear picture of yourself.
        Your selfie will be securely uploaded
        as part of your identity verification.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      {/* =====================================================
          CAMERA
      ===================================================== */}

      <div className="mt-6 overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-auto w-full"
        />
      </div>

      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="mt-6 flex flex-wrap gap-3">
        {!cameraStarted && (
          <button
            type="button"
            onClick={startCamera}
            disabled={verifying}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Camera
          </button>
        )}

        {cameraStarted && (
          <>
            <button
              type="button"
              onClick={verifyFace}
              disabled={verifying}
              className="rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying
                ? "Uploading..."
                : "Take Selfie"}
            </button>

            <button
              type="button"
              onClick={stopCamera}
              disabled={verifying}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* =====================================================
          INSTRUCTIONS
      ===================================================== */}

      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <h3 className="font-medium">
          Before taking your selfie
        </h3>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            Make sure your face is clearly
            visible.
          </li>

          <li>
            Use good lighting.
          </li>

          <li>
            Remove anything covering your
            face.
          </li>

          <li>
            Look directly at the camera.
          </li>

          <li>
            Keep your face inside the camera
            frame.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FaceVerificationStep;

