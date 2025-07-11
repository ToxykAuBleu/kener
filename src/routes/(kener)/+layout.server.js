// @ts-nocheck
import i18n from "$lib/i18n/server";
import { redirect } from "@sveltejs/kit";
import MobileDetect from "mobile-detect";

import { base } from "$app/paths";
import {
  GetAllSiteData,
  IsSetupComplete,
  IsLoggedInSession,
  GetLocaleFromCookie,
  IsEmailSetup,
  GetSubscriptionTriggerByEmail,
} from "$lib/server/controllers/controller.js";

export async function load({ params, route, url, cookies, request }) {
  const userAgent = request.headers.get("user-agent");
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();

  let isSetupComplete = await IsSetupComplete();
  if (!isSetupComplete) {
    throw redirect(302, base + "/manage/setup");
  }

  if (process.env.KENER_SECRET_KEY === undefined || process.env.ORIGIN === undefined) {
    throw redirect(302, base + "/manage/setup");
  }

  let isLoggedIn = await IsLoggedInSession(cookies);

  let site = await GetAllSiteData();
  const headers = request.headers;
  let localTz = "UTC";
  const localTzCookie = cookies.get("localTz");
  if (!!localTzCookie) {
    localTz = localTzCookie;
  }

  // if the user agent is lighthouse, then we are running a lighthouse test
  //if bot also set localTz to -1 to avoid reload
  let isBot = false;
  if (userAgent?.includes("Chrome-Lighthouse") || userAgent?.includes("bot")) {
    isBot = true;
  }

  let selectedLang = GetLocaleFromCookie(site, cookies);

  const query = url.searchParams;
  const bgc = query.get("bgc") ? "#" + query.get("bgc") : "";
  const emailSubscriptionTrigger = await GetSubscriptionTriggerByEmail();

  return {
    site: site,
    localTz: localTz,
    isBot,
    lang: i18n(String(selectedLang)),
    selectedLang: selectedLang,
    isLoggedIn: !!isLoggedIn.user,
    canSendEmail: IsEmailSetup(),
    canUsersSubscribe: !!emailSubscriptionTrigger && emailSubscriptionTrigger.subscription_trigger_status == "ACTIVE",
    isMobile: isMobile,
  };
}
