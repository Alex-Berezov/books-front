<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/html401"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap - Bibliaris</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #333;
            background-color: #f7f9fa;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #fff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          h1 {
            color: #8c5300;
            margin-top: 0;
            font-size: 28px;
            font-weight: 700;
          }
          p {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          p a {
            color: #8c5300;
            text-decoration: none;
            font-weight: 500;
          }
          p a:hover {
            text-decoration: underline;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 15px;
          }
          th {
            background-color: #fcf8f2;
            color: #8c5300;
            text-align: left;
            padding: 12px 10px;
            font-size: 13px;
            font-weight: 600;
            border-bottom: 2px solid #f0e2d0;
          }
          td {
            padding: 12px 10px;
            font-size: 13px;
            border-bottom: 1px solid #f0f0f0;
            word-break: break-all;
          }
          tr:hover td {
            background-color: #fafafa;
          }
          .url-link {
            color: #8c5300;
            text-decoration: none;
            font-weight: 500;
          }
          .url-link:hover {
            text-decoration: underline;
          }
          .alternate-lang {
            display: inline-block;
            background: #fcf8f2;
            color: #8c5300;
            border: 1px solid #f0e2d0;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            margin-right: 4px;
            margin-bottom: 4px;
            font-weight: 500;
          }
          .alternate-lang a {
            color: inherit;
            text-decoration: none;
          }
          .alternate-lang a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>XML Sitemap</h1>
          <p>
            This XML Sitemap is generated dynamically to help search engines like Google discover and index the pages of <a href="https://bibliaris.com">Bibliaris</a>.
            It contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.
          </p>
          <table>
            <thead>
              <tr>
                <th width="45%">URL</th>
                <th width="35%">Languages (Alternates)</th>
                <th width="10%">Change Freq.</th>
                <th width="10%">Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a class="url-link" href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <xsl:for-each select="xhtml:link">
                      <span class="alternate-lang">
                        <strong><xsl:value-of select="@hreflang"/>: </strong>
                        <a href="{@href}"><xsl:value-of select="@href"/></a>
                      </span>
                    </xsl:for-each>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:priority"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
