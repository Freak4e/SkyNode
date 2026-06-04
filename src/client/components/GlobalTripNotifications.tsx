import { useEffect, useRef, useState } from "react";
import { MessageCircle, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listSavedTrips } from "../api/assistantApi";
import {
  listUnreadNotifications,
  markNotificationRead,
  markNotificationReferenceRead,
} from "../api/notificationsApi";
import { listJoinedTrips } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { AppNotification, AppNotificationType, SavedTripSummary, TripMember, TripMessage } from "../../shared/types.js";

type NotificationKind = "message" | "request";

type TripNotification = {
  id: string;
  body: string;
  kind: NotificationKind;
  notificationId?: string;
  referenceId?: string;
  target: string;
  title: string;
  tripTitle: string;
  type?: AppNotificationType;
};

type TripSubscription = {
  id: string;
  title: string;
  canNotifyMessages: boolean;
  canNotifyRequests: boolean;
};

export function GlobalTripNotifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<TripNotification[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading || !user || !supabase) {
      return;
    }

    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    const userId = user.id;

    async function subscribeToTrips() {
      try {
        const [createdTrips, joinedTrips] = await Promise.all([
          listSavedTrips(),
          listJoinedTrips(),
        ]);

        if (cancelled || !supabase) return;

        const subscriptions = buildTripSubscriptions(createdTrips, joinedTrips);
        const tripTitles = new Map(subscriptions.map((trip) => [trip.id, trip.title]));

        try {
          const unread = await listUnreadNotifications();
          if (!cancelled) {
            unread.reverse().forEach((notification) => {
              addNotificationOnce(`stored:${notification.id}`, notificationFromStored(notification, tripTitles));
            });
          }
        } catch {
          // Realtime can still work even if persisted notification fetch fails.
        }

        for (const trip of subscriptions) {
          const channel = supabase
            .channel(`trip-room-${trip.id}`, {
              config: {
                broadcast: {
                  self: false,
                },
              },
            })
            .on("broadcast", { event: "message" }, (payload) => {
              if (!trip.canNotifyMessages) return;

              const message = (payload.payload as { message?: TripMessage }).message;
              if (!message || message.userId === userId) return;

              addNotificationOnce(`message:${message.id}`, {
                kind: "message",
                title: message.displayName,
                body: message.content,
                referenceId: message.id,
                tripTitle: trip.title,
                target: `/trips/${trip.id}?tab=chat`,
                type: "trip_message",
              });
            })
            .on("broadcast", { event: "join_request" }, (payload) => {
              if (!trip.canNotifyRequests) return;

              const member = (payload.payload as { member?: TripMember }).member;
              if (!member || member.userId === userId || member.status !== "pending") return;

              addNotificationOnce(`join:${member.id}`, {
                kind: "request",
                title: "New join request",
                body: `${member.displayName} wants to join ${trip.title}.`,
                referenceId: member.id,
                tripTitle: trip.title,
                target: `/trips/${trip.id}?tab=members`,
                type: "join_request",
              });
            })
            .subscribe();

          channels.push(channel);
        }
      } catch {
        // Global notifications should not block navigation if trip loading fails.
      }
    }

    const timer = window.setTimeout(() => void subscribeToTrips(), 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      channels.forEach((channel) => {
        void supabase?.removeChannel(channel);
      });
    };
  }, [loading, user]);

  function addNotificationOnce(key: string, notification: Omit<TripNotification, "id">) {
    if (notifiedRef.current.has(key)) return;

    notifiedRef.current.add(key);
    const id = crypto.randomUUID();
    setNotifications((current) => [...current.slice(-3), { ...notification, id }]);
    window.setTimeout(() => {
      void closeNotification(id);
    }, 10000);
  }

  async function closeNotification(id: string) {
    const notification = notifications.find((item) => item.id === id);
    setNotifications((current) => current.filter((item) => item.id !== id));
    await markToastRead(notification);
  }

  async function openNotification(notification: TripNotification) {
    await closeNotification(notification.id);
    navigate(notification.target);
  }

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[130] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5">
      {notifications.map((notification) => (
        <TripNotificationToast
          key={notification.id}
          notification={notification}
          onClose={closeNotification}
          onOpen={openNotification}
        />
      ))}
    </div>
  );
}

function notificationFromStored(
  notification: AppNotification,
  tripTitles: Map<string, string>,
): Omit<TripNotification, "id"> {
  const message = notification.type === "trip_message";

  return {
    kind: message ? "message" : "request",
    notificationId: notification.id,
    referenceId: notification.referenceId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    tripTitle: notification.tripId ? tripTitles.get(notification.tripId) || "Trip update" : "Trip update",
    target: notification.targetPath,
  };
}

async function markToastRead(notification: TripNotification | undefined) {
  if (!notification) return;

  try {
    if (notification.notificationId) {
      await markNotificationRead(notification.notificationId);
      return;
    }

    if (notification.type && notification.referenceId) {
      await markNotificationReferenceRead(notification.type, notification.referenceId);
    }
  } catch {
    // Read state is best-effort; never block navigation/toast dismissal.
  }
}

function TripNotificationToast({
  notification,
  onClose,
  onOpen,
}: {
  notification: TripNotification;
  onClose: (id: string) => void;
  onOpen: (notification: TripNotification) => void;
}) {
  const request = notification.kind === "request";

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/75 bg-white/88 shadow-xl shadow-slate-950/14 ring-1 ring-slate-950/5 backdrop-blur-2xl">
      <div className="relative">
        <button type="button" onClick={() => onOpen(notification)} className="block w-full text-left">
          <div className="bg-linear-to-br from-white/95 via-sky-50/75 to-cyan-50/60 p-3.5 transition hover:from-sky-50 hover:to-cyan-50">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1 ${
                request ? "bg-cyan-100 text-cyan-800 ring-cyan-200" : "bg-sky-100 text-sky-800 ring-sky-200"
              }`}>
                {request ? <Users className="h-4.5 w-4.5" /> : <MessageCircle className="h-4.5 w-4.5" />}
              </span>
              <div className="min-w-0 flex-1 pr-8">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950">{notification.title}</p>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${request ? "bg-cyan-400" : "bg-sky-400"}`} />
                  <p className="truncate text-xs font-black text-slate-500">{notification.tripTitle}</p>
                </div>
                <p className="mt-1 line-clamp-1 text-sm font-semibold leading-5 text-slate-600">{notification.body}</p>
              </div>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onClose(notification.id)}
          className="absolute right-2.5 top-2.5 rounded-full bg-white/65 p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-800"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${
          request ? "bg-cyan-400" : "bg-sky-400"
        }`} />
      </div>
    </div>
  );
}
function buildTripSubscriptions(createdTrips: SavedTripSummary[], joinedTrips: SavedTripSummary[]): TripSubscription[] {
  const byId = new Map<string, TripSubscription>();

  for (const trip of createdTrips) {
    byId.set(trip.id, {
      id: trip.id,
      title: trip.title,
      canNotifyMessages: true,
      canNotifyRequests: true,
    });
  }

  for (const trip of joinedTrips) {
    const current = byId.get(trip.id);
    byId.set(trip.id, {
      id: trip.id,
      title: trip.title,
      canNotifyMessages: true,
      canNotifyRequests: current?.canNotifyRequests || false,
    });
  }

  return Array.from(byId.values());
}
