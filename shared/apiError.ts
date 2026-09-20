export function apiMessage(error: unknown, fallback = "Request failed") {
  const message = (
    error as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data?.error?.message;
  return message ?? fallback;
}

export function apiStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}
