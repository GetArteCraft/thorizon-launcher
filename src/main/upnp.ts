import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";

export interface UpnpResult {
  ok: boolean;
  message: string;
  externalIp?: string;
}

interface Gateway {
  controlUrl: string;
  service: string;
  location: string;
}

function localAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
}

function discover(timeoutMs = 2200): Promise<string[]> {
  return new Promise((resolve) => {
    const socket = createSocket({ type: "udp4", reuseAddr: true });
    const locations = new Set<string>();
    const message = [
      "M-SEARCH * HTTP/1.1",
      "HOST: 239.255.255.250:1900",
      'MAN: "ssdp:discover"',
      "MX: 2",
      "ST: urn:schemas-upnp-org:device:InternetGatewayDevice:1",
      "",
      "",
    ].join("\r\n");

    const finish = () => {
      try {
        socket.close();
      } catch {
        // сокет уже закрыт
      }
      resolve([...locations]);
    };

    socket.on("message", (buffer) => {
      const text = buffer.toString("utf8");
      const match = text.match(/^LOCATION:\s*(.+)$/im);
      if (match?.[1]) locations.add(match[1].trim());
    });
    socket.on("error", finish);
    socket.bind(() => {
      try {
        socket.setBroadcast(true);
        socket.send(message, 1900, "239.255.255.250");
      } catch {
        finish();
      }
    });
    setTimeout(finish, timeoutMs);
  });
}

/** Ищем controlURL для WANIPConnection/WANPPPConnection в описании шлюза. */
export function parseControlUrl(xml: string, location: string): Gateway | null {
  for (const service of [
    "urn:schemas-upnp-org:service:WANIPConnection:1",
    "urn:schemas-upnp-org:service:WANPPPConnection:1",
  ]) {
    const block = new RegExp(
      `<service>[\\s\\S]*?<serviceType>\\s*${service.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</serviceType>[\\s\\S]*?<controlURL>([^<]+)</controlURL>[\\s\\S]*?</service>`,
      "i",
    ).exec(xml);
    if (block?.[1]) {
      try {
        return { controlUrl: new URL(block[1].trim(), location).href, service, location };
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function findGateway(): Promise<Gateway | null> {
  const locations = await discover();
  for (const location of locations) {
    try {
      const response = await fetch(location, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) continue;
      const gateway = parseControlUrl(await response.text(), location);
      if (gateway) return gateway;
    } catch {
      // следующий кандидат
    }
  }
  return null;
}

function soap(service: string, action: string, body: string): string {
  return [
    '<?xml version="1.0"?>',
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">',
    "<s:Body>",
    `<u:${action} xmlns:u="${service}">${body}</u:${action}>`,
    "</s:Body>",
    "</s:Envelope>",
  ].join("");
}

async function call(gateway: Gateway, action: string, body: string, timeoutMs = 3500): Promise<{ ok: boolean; text: string }> {
  try {
    const response = await fetch(gateway.controlUrl, {
      method: "POST",
      headers: {
        "Content-Type": 'text/xml; charset="utf-8"',
        SOAPAction: `"${gateway.service}#${action}"`,
      },
      body: soap(gateway.service, action, body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    const error = /<errorCode>(\d+)<\/errorCode>/i.exec(text)?.[1];
    return { ok: response.ok && !error, text: error ?? text.slice(0, 200) };
  } catch (error) {
    return { ok: false, text: String(error) };
  }
}

export async function mapPort(port: number, description = "THorizon server"): Promise<UpnpResult> {
  const internal = localAddress();
  if (!internal) return { ok: false, message: "No local IPv4 address" };
  const gateway = await findGateway();
  if (!gateway) return { ok: false, message: "No UPnP gateway answered" };

  const body = [
    "<NewRemoteHost></NewRemoteHost>",
    `<NewExternalPort>${port}</NewExternalPort>`,
    "<NewProtocol>TCP</NewProtocol>",
    `<NewInternalPort>${port}</NewInternalPort>`,
    `<NewInternalClient>${internal}</NewInternalClient>`,
    "<NewEnabled>1</NewEnabled>",
    `<NewPortMappingDescription>${description}</NewPortMappingDescription>`,
    "<NewLeaseDuration>0</NewLeaseDuration>",
  ].join("");

  const result = await call(gateway, "AddPortMapping", body);
  if (!result.ok) return { ok: false, message: `Router refused the mapping (${result.text})` };

  const external = await call(
    gateway,
    "GetExternalIPAddress",
    "<NewExternalIPAddress></NewExternalIPAddress>",
  );
  const ip = /<NewExternalIPAddress>([^<]+)<\/NewExternalIPAddress>/i.exec(external.text)?.[1];
  return { ok: true, message: `Port ${port} mapped to ${internal}`, externalIp: ip };
}

export async function unmapPort(port: number): Promise<void> {
  const gateway = await findGateway();
  if (!gateway) return;
  await call(
    gateway,
    "DeletePortMapping",
    `<NewRemoteHost></NewRemoteHost><NewExternalPort>${port}</NewExternalPort><NewProtocol>TCP</NewProtocol>`,
  );
}
