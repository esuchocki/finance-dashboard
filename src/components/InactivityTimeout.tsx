import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const INACTIVITY_MS = 30 * 60 * 1000;   // 30 min before warning appears
const WARNING_MS    =  5 * 60 * 1000;   // 5 min to respond before forced logout

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

const InactivityTimeout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_MS / 1000);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoggedOut    = useRef(false);

  // Refs hold state that event-listener closures need to read without going stale.
  // Using refs (not state) means closures always see the current value without
  // requiring the listener to be re-registered on every render.
  const warningActive   = useRef(false);  // mirrors showWarning for use in closures
  const inactivityEndAt = useRef(0);      // wall-clock ms: when the 30-min timeout fires
  const warningEndAt    = useRef(0);      // wall-clock ms: when the 5-min warning expires

  const clearTimers = useCallback(() => {
    if (inactivityTimer.current)  { clearTimeout(inactivityTimer.current);  inactivityTimer.current  = null; }
    if (countdownTimer.current)   { clearInterval(countdownTimer.current);  countdownTimer.current   = null; }
  }, []);

  const doLogout = useCallback(() => {
    if (hasLoggedOut.current) return;
    hasLoggedOut.current  = true;
    warningActive.current = false;
    clearTimers();
    setShowWarning(false);
    logout();
    toast.info('Session ended due to inactivity.');
    navigate('/login');
  }, [logout, navigate, clearTimers]);

  // Stable ref to doLogout so the interval closure always calls the current version
  // without needing to be recreated every time doLogout changes.
  const doLogoutRef = useRef(doLogout);
  useEffect(() => { doLogoutRef.current = doLogout; }, [doLogout]);

  const startCountdown = useCallback(() => {
    warningActive.current = true;
    warningEndAt.current  = Date.now() + WARNING_MS;
    setShowWarning(true);
    setSecondsLeft(Math.ceil(WARNING_MS / 1000));

    if (countdownTimer.current) clearInterval(countdownTimer.current);

    // Poll every 500ms using wall-clock time.
    //
    // setInterval is throttled by browsers in background tabs (Chrome/Edge throttle
    // to ≥1 tick/minute after ~5 min hidden; Firefox similarly). A counter-based
    // approach ("decrement by 1 each tick") would therefore run for hours instead of
    // minutes. Computing from Date.now() means even a heavily throttled tick reflects
    // true elapsed time, and logout fires as soon as the tab is active again.
    // The visibilitychange handler below is a belt-and-suspenders safety net.
    countdownTimer.current = setInterval(() => {
      const remaining = Math.ceil((warningEndAt.current - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        doLogoutRef.current();
      } else {
        setSecondsLeft(remaining);
      }
    }, 500);
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearTimers();
    hasLoggedOut.current    = false;
    warningActive.current   = false;
    warningEndAt.current    = 0;
    inactivityEndAt.current = Date.now() + INACTIVITY_MS;

    inactivityTimer.current = setTimeout(() => {
      startCountdown();
    }, INACTIVITY_MS);
  }, [clearTimers, startCountdown]);

  const handleContinue = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    startInactivityTimer();
  }, [clearTimers, startInactivityTimer]);

  // Backstop: if the interval fires but doLogoutRef somehow isn't called (e.g. a
  // future React batching edge case), the effect catches secondsLeft hitting 0.
  useEffect(() => {
    if (showWarning && secondsLeft <= 0) {
      doLogout();
    }
  }, [showWarning, secondsLeft, doLogout]);

  // Main inactivity detection + tab-visibility guard
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    startInactivityTimer();

    // Uses warningActive ref (not showWarning state) to avoid stale closure:
    // without this, user mouse movement would reset the 30-min timer even while
    // the warning dialog is visible.
    const resetTimer = () => {
      if (!warningActive.current) startInactivityTimer();
    };

    // Fires immediately when the user returns to the tab.
    // Handles the case where the browser throttled or suspended timers while
    // the tab was hidden — we check the recorded deadline timestamps directly.
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const now = Date.now();

      if (warningActive.current && warningEndAt.current > 0 && now >= warningEndAt.current) {
        doLogoutRef.current();
        return;
      }
      if (!warningActive.current && inactivityEndAt.current > 0 && now >= inactivityEndAt.current) {
        startCountdown();
        return;
      }
      // Resync display if the warning is visible but the deadline hasn't passed yet
      if (warningActive.current && warningEndAt.current > 0) {
        setSecondsLeft(Math.max(0, Math.ceil((warningEndAt.current - now) / 1000)));
      }
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, startInactivityTimer, clearTimers, startCountdown]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <>
      {children}
      <Dialog open={showWarning} onOpenChange={() => {}}>
        <DialogContent onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Session Timeout Warning</DialogTitle>
            <DialogDescription>
              You have been inactive for 30 minutes. Your session will end automatically to protect your data.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-2xl font-mono font-semibold tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">remaining</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={doLogout}>Sign Out Now</Button>
            <Button onClick={handleContinue}>Continue Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InactivityTimeout;
