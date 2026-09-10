self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch {
    data = {
      title: "EMAE • SABARÁ",
      body: event.data?.text() || "Nova atividade no monitoramento.",
    };
  }

  const title =
    data.title ||
    "EMAE • SABARÁ";

  const options = {
    body:
      data.body ||
      "Nova atividade registrada.",

    icon:
      data.icon ||
      "/favicon.ico",

    badge:
      "/favicon.ico",

    tag:
      data.tag ||
      `emae-${Date.now()}`,

    renotify: true,

    data: {
      url:
        data.url ||
        "/emae/sabara",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options,
    ),
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification.data?.url ||
      "/emae/sabara";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(
          async (clientList) => {
            for (
              const client
              of clientList
            ) {
              if (
                "focus" in client
              ) {
                await client.focus();

                if (
                  "navigate" in client
                ) {
                  await client.navigate(
                    targetUrl,
                  );
                }

                return;
              }
            }

            if (
              clients.openWindow
            ) {
              return clients.openWindow(
                targetUrl,
              );
            }

            return undefined;
          },
        ),
    );
  },
);
