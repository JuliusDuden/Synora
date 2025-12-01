const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const networkSecurityConfigContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">synora.duckdns.org</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>`;

const withAndroidNetworkSecurityConfig = (config) => {
  // Add to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    if (androidManifest.application && androidManifest.application[0]) {
      androidManifest.application[0].$['android:networkSecurityConfig'] = '@xml/network_security_config';
      androidManifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    }

    return config;
  });

  // Copy network_security_config.xml file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xmlDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      // Create xml directory if it doesn't exist
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      // Write network_security_config.xml
      const xmlFilePath = path.join(xmlDir, 'network_security_config.xml');
      fs.writeFileSync(xmlFilePath, networkSecurityConfigContent);

      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidNetworkSecurityConfig;
