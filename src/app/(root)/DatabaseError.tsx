"use client"

import React, { useState, useEffect } from 'react';

export default function ErrorPage() {
  const [ipRevealed, setIpRevealed] = useState(false);
  const [userIp, setUserIp] = useState('');
  const [loadingIp, setLoadingIp] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Format current time dynamically in Philippine Standard Time (PST / Asia/Manila)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);

      // Reformat string to YYYY-MM-DD HH:MM:SS PST
      const parts = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
      setCurrentTime(`${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} PST`);
    };

    updateTime();
  }, []);

  // Fetch real IP address from API
  const handleRevealIp = async () => {
    setLoadingIp(true);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setUserIp(data.ip);
    } catch (error) {
      setUserIp('Unavailable');
    } finally {
      setLoadingIp(false);
      setIpRevealed(true);
    }
  };

  const iconBrowser = "url(\"data:image/svg+xml;utf8,<svg id='a' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80.7362'><path d='M89.8358.1636H10.1642C4.6398.1636.1614,4.6421.1614,10.1664v60.4033c0,5.5244,4.4784,10.0028,10.0028,10.0028h79.6716c5.5244,0,10.0027-4.4784,10.0027-10.0028V10.1664c0-5.5244-4.4784-10.0028-10.0027-10.0028ZM22.8323,9.6103c1.9618,0,3.5522,1.5903,3.5522,3.5521s-1.5904,3.5522-3.5522,3.5522-3.5521-1.5904-3.5521-3.5522,1.5903-3.5521,3.5521-3.5521ZM12.8936,9.6103c1.9618,0,3.5522,1.5903,3.5522,3.5521s-1.5904,3.5522-3.5522,3.5522-3.5521-1.5904-3.5521-3.5522,1.5903-3.5521,3.5521-3.5521ZM89.8293,70.137H9.7312V24.1983h80.0981v45.9387ZM89.8293,16.1619H29.8524v-5.999h59.977v5.999Z' style='fill: %23999;'/></svg>\")";
  const iconCloud = "url(\"data:image/svg+xml;utf8,<svg id='a' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 152 78.9141'><path d='M132.2996,77.9927v-.0261c10.5477-.2357,19.0305-8.8754,19.0305-19.52,0-10.7928-8.7161-19.5422-19.4678-19.5422-2.9027,0-5.6471.6553-8.1216,1.7987C123.3261,18.6624,105.3419.9198,83.202.9198c-17.8255,0-32.9539,11.5047-38.3939,27.4899-3.0292-2.2755-6.7818-3.6403-10.8622-3.6403-10.0098,0-18.1243,8.1145-18.1243,18.1243,0,1.7331.258,3.4033.7122,4.9905-.2899-.0168-.5769-.0442-.871-.0442-8.2805,0-14.993,6.7503-14.993,15.0772,0,8.2795,6.6381,14.994,14.8536,15.0701v.0054h.1069c.0109,0,.0215.0016.0325.0016s.0215-.0016.0325-.0016' style='fill: %23999;'/></svg>\")";
  const iconServer = "url(\"data:image/svg+xml;utf8,<svg id='a' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 95 75'><path d='M94.0103,45.0775l-12.9885-38.4986c-1.2828-3.8024-4.8488-6.3624-8.8618-6.3619l-49.91.0065c-3.9995.0005-7.556,2.5446-8.8483,6.3295L1.0128,42.8363c-.3315.971-.501,1.9899-.5016,3.0159l-.0121,19.5737c-.0032,5.1667,4.1844,9.3569,9.3513,9.3569h75.2994c5.1646,0,9.3512-4.1866,9.3512-9.3512v-17.3649c0-1.0165-.1657-2.0262-.4907-2.9893ZM86.7988,65.3097c0,1.2909-1.0465,2.3374-2.3374,2.3374H9.9767c-1.2909,0-2.3374-1.0465-2.3374-2.3374v-18.1288c0-1.2909,1.0465-2.3374,2.3374-2.3374h74.4847c1.2909,0,2.3374,1.0465,2.3374,2.3374v18.1288Z' style='fill: %23999;'/><circle cx='74.6349' cy='56.1889' r='4.7318' style='fill: %23999;'/><circle cx='59.1472' cy='56.1889' r='4.7318' style='fill: %23999;'/></svg>\")";
  const iconError = "url(\"data:image/svg+xml;utf8,<svg id='a' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 47.9145 47.9641'><circle cx='23.9572' cy='23.982' r='23.4815' style='fill: %23bd2426;'/><line x1='19.0487' y1='19.0768' x2='27.8154' y2='28.8853' style='fill: none; stroke: %23fff; stroke-linecap: round; stroke-linejoin: round; stroke-width: 3px;'/><line x1='27.8154' y1='19.0768' x2='19.0487' y2='28.8853' style='fill: none; stroke: %23fff; stroke-linecap: round; stroke-linejoin: round; stroke-width: 3px;'/></svg>\")";

  return (
    <div
      id="cf-wrapper"
      className="m-0 min-h-screen w-full bg-white p-0 shadow-none text-[#404040] antialiased text-[16px] [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,'Noto_Sans',sans-serif]"
    >
      <div id="cf-error-details" className="p-0 shadow-none">
        
        {/* Header */}
        <header className="mx-auto my-0 mb-8 w-full max-w-[60rem] px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8 shadow-none">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-light leading-tight text-[#404040] sm:text-4xl md:text-[60px]">
            <span>Database Failure</span>
            <span className="inline-flex items-center rounded-[1.25rem] bg-[#d9d9d9] px-3 py-1 text-[0.75rem] font-medium text-[#313131] shadow-none">
              Error code 500
            </span>
          </h1>
          <div className="mt-2 text-sm sm:text-base">
            Visit{' '}
            <a
              href="https://www.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2f7bbf] no-underline transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] hover:text-[#f68b1f]"
            >
              cloudflare.com
            </a>{' '}
            for no help at all.
          </div>
          <div className="mt-3 text-sm text-[#999999]">{currentTime || 'Loading...'}</div>
        </header>

        {/* Status Bar Container */}
        <div className="my-8 bg-[linear-gradient(to_bottom,#dedede,#ebebeb_3%,#ebebeb_97%,#dedede)] shadow-none">
          <div className="mx-auto w-full max-w-[60rem] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-stretch">
              
              {/* Database / Browser Status */}
              <div
                id="cf-browser-status"
                className="relative flex-1 border-b border-solid border-[#dedede] py-6 text-left md:border-b-0 md:py-[3.75rem] md:text-center"
              >
                <div className="relative mb-4 md:mb-10">
                  <span
                    className="hidden h-20 bg-center bg-no-repeat md:block"
                    style={{ backgroundImage: iconBrowser }}
                  />
                  <span
                    className="absolute right-0 top-0 h-10 w-10 md:bottom-[-1rem] md:left-1/2 md:right-auto md:top-auto md:-ml-6 md:h-12 md:w-12"
                    style={{ backgroundImage: iconError }}
                  />
                </div>
                <span className="block w-full truncate text-sm sm:text-base">You</span>
                <h3 className="mt-1 text-xl font-light leading-[1.3] text-[#999999] sm:text-2xl md:mt-3">
                  Database
                </h3>
                <span className="block text-xl leading-[1.3] text-[#bd2426] sm:text-2xl">
                  Out of Memory
                </span>
              </div>

              {/* Cloudflare Status */}
              <div
                id="cf-cloudflare-status"
                className="relative flex-1 border-b border-solid border-[#dedede] py-6 text-left md:border-b-0 md:py-[3.75rem] md:text-center"
              >
                <div className="relative mb-4 md:mb-10">
                  <span
                    className="hidden h-20 bg-center bg-no-repeat md:block"
                    style={{ backgroundImage: iconCloud }}
                  />
                  <span
                    className="absolute right-0 top-0 h-10 w-10 md:bottom-[-1rem] md:left-1/2 md:right-auto md:top-auto md:-ml-6 md:h-12 md:w-12"
                    style={{ backgroundImage: iconError }}
                  />
                </div>
                <span className="block w-full truncate text-sm sm:text-base">Everywhere</span>
                <h3 className="mt-1 text-xl font-light leading-[1.3] text-[#2f7bbf] sm:text-2xl md:mt-3">
                  Cloudflare
                </h3>
                <span className="block text-xl leading-[1.3] text-[#bd2426] sm:text-2xl">
                  Connection Timeout
                </span>
              </div>

              {/* Host Status */}
              <div
                id="cf-host-status"
                className="relative flex-1 py-6 text-left md:py-[3.75rem] md:text-center"
              >
                <div className="relative mb-4 md:mb-10">
                  <span
                    className="hidden h-20 bg-center bg-no-repeat md:block"
                    style={{ backgroundImage: iconServer }}
                  />
                  <span
                    className="absolute right-0 top-0 h-10 w-10 md:bottom-[-1rem] md:left-1/2 md:right-auto md:top-auto md:-ml-6 md:h-12 md:w-12"
                    style={{ backgroundImage: iconError }}
                  />
                </div>
                <span className="block w-full truncate text-sm sm:text-base">
                  https://www.dinklab.app/
                </span>
                <h3 className="mt-1 text-xl font-light leading-[1.3] text-[#999999] sm:text-2xl md:mt-3">
                  Host
                </h3>
                <span className="block text-xl leading-[1.3] text-[#bd2426] sm:text-2xl">
                  Origin Is Unreachable
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto mb-8 w-full max-w-[60rem] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <div className="leading-relaxed">
              <h2 className="mb-2 text-2xl font-normal leading-[1.3] sm:text-3xl">What happened?</h2>
              <p className="text-[15px] leading-[1.5]">
                The server is temporarily unable to process your request.
              </p>
            </div>
            <div className="leading-relaxed">
              <h2 className="mb-2 text-2xl font-normal leading-[1.3] sm:text-3xl">What can I do?</h2>
              <p className="text-[15px] leading-[1.5]">
                Please try again in a few minutes. If the problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mx-auto w-full max-w-[60rem] border-t border-solid border-t-[#ebebeb] px-4 py-6 text-center shadow-none sm:px-6 sm:text-left lg:px-8">
          <p className="flex flex-col gap-1 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <span>
              Ray ID: <strong className="font-semibold">0123456789abcdef</strong>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span id="cf-footer-item-ip">
              Your IP:{' '}
              {!ipRevealed ? (
                <button
                  type="button"
                  id="cf-footer-ip-reveal"
                  onClick={handleRevealIp}
                  disabled={loadingIp}
                  className="cursor-pointer border-none bg-transparent p-0 font-inherit text-[#0051c3] no-underline transition-colors duration-150 ease-in-out hover:text-[#ee730a] disabled:opacity-50"
                >
                  {loadingIp ? 'Fetching IP...' : 'Click to reveal'}
                </button>
              ) : (
                <span id="cf-footer-ip">{userIp}</span>
              )}
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span>
              <span>Performance &amp; security by</span>{' '}
              <a
                rel="noopener noreferrer"
                href="https://www.cloudflare.com/"
                id="brand_link"
                target="_blank"
                className="text-[#2f7bbf] no-underline transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] hover:text-[#f68b1f]"
              >
                Cloudflare
              </a>
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}