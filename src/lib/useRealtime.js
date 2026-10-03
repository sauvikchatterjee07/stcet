import { useEffect, useRef, useSyncExternalStore } from "react";

import { realtime, RealtimeEvents, RealtimeStatus, STCET_TESTS_TOPIC } from "./realtime";

/** Runs handler(data, message) for every server event of this type while mounted. */
export function useRealtimeEvent(type, handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(
    () => realtime.subscribe(type, (data, message) => handlerRef.current(data, message)),
    [type]
  );
}

/** Joins a server topic while mounted. Pass null to skip. */
export function useRealtimeTopic(topic) {
  useEffect(() => (topic ? realtime.joinTopic(topic) : undefined), [topic]);
}

const subscribeStatus = (onChange) => realtime.onStatusChange(onChange);
const getStatus = () => realtime.status;

export function useRealtimeStatus() {
  return useSyncExternalStore(subscribeStatus, getStatus);
}

/**
 * Calls reload whenever an admin changes a test, and after a reconnect
 * (changes made while the socket was down were missed).
 */
export function useStcetTestsLive(reload) {
  useRealtimeTopic(STCET_TESTS_TOPIC);
  useRealtimeEvent(RealtimeEvents.STCET_TESTS_CHANGED, () => reload());

  const isLive = useRealtimeStatus() === RealtimeStatus.OPEN;
  const wasLiveRef = useRef(isLive);
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });
  useEffect(() => {
    const reconnected = isLive && !wasLiveRef.current;
    wasLiveRef.current = isLive;
    if (reconnected) reloadRef.current();
  }, [isLive]);
}
