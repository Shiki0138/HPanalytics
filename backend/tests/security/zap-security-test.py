#!/usr/bin/env python3
"""
OWASP ZAP Security Testing Script
エンタープライズ級セキュリティテスト自動化
"""

import os
import sys
import time
import json
import requests
import subprocess
from datetime import datetime
from zapv2 import ZAPv2

class SecurityTester:
    def __init__(self, target_url='http://localhost:3000', zap_proxy='127.0.0.1:8080'):
        self.target_url = target_url
        self.zap_proxy = zap_proxy
        self.zap = ZAPv2(proxies={'http': f'http://{zap_proxy}', 'https': f'https://{zap_proxy}'})
        self.report_dir = 'security-reports'
        self.session_token = None
        
        # Create reports directory
        os.makedirs(self.report_dir, exist_ok=True)
        
        print(f"🛡️  Security Testing initialized")
        print(f"📍 Target URL: {self.target_url}")
        print(f"🔍 ZAP Proxy: {zap_proxy}")

    def setup_authentication(self):
        """Setup authentication for authenticated scanning"""
        try:
            print("🔐 Setting up authentication...")
            
            # Login to get session token
            login_data = {
                'email': 'security-test@example.com',
                'password': 'SecurityTest123!'
            }
            
            # First register the user
            register_response = requests.post(
                f"{self.target_url.replace(':3000', ':8000')}/api/auth/register",
                json={
                    **login_data,
                    'name': 'Security Test User'
                },
                timeout=30
            )
            
            # Then login
            login_response = requests.post(
                f"{self.target_url.replace(':3000', ':8000')}/api/auth/login",
                json=login_data,
                timeout=30
            )
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                self.session_token = login_data.get('tokens', {}).get('accessToken')
                print("✅ Authentication setup successful")
                return True
            else:
                print(f"⚠️  Authentication setup failed: {login_response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication setup error: {e}")
            return False

    def passive_scan(self):
        """Perform passive security scanning"""
        print("🔍 Starting passive security scan...")
        
        try:
            # Access main pages to build site tree
            pages = [
                '/',
                '/login',
                '/register',
                '/dashboard',
                '/settings'
            ]
            
            headers = {}
            if self.session_token:
                headers['Authorization'] = f'Bearer {self.session_token}'
            
            for page in pages:
                url = f"{self.target_url}{page}"
                try:
                    print(f"   📄 Scanning: {url}")
                    self.zap.urlopen(url)
                    time.sleep(1)
                except Exception as e:
                    print(f"   ⚠️  Failed to access {url}: {e}")
            
            # Wait for passive scan to complete
            print("⏳ Waiting for passive scan to complete...")
            while int(self.zap.pscan.records_to_scan) > 0:
                print(f"   📊 Records to scan: {self.zap.pscan.records_to_scan}")
                time.sleep(5)
            
            print("✅ Passive scan completed")
            return True
            
        except Exception as e:
            print(f"❌ Passive scan error: {e}")
            return False

    def active_scan(self):
        """Perform active security scanning"""
        print("🚀 Starting active security scan...")
        
        try:
            # Start active scan
            scan_id = self.zap.ascan.scan(self.target_url)
            print(f"   🆔 Active scan ID: {scan_id}")
            
            # Monitor scan progress
            while int(self.zap.ascan.status(scan_id)) < 100:
                progress = self.zap.ascan.status(scan_id)
                print(f"   📈 Active scan progress: {progress}%")
                time.sleep(10)
            
            print("✅ Active scan completed")
            return True
            
        except Exception as e:
            print(f"❌ Active scan error: {e}")
            return False

    def spider_scan(self):
        """Perform spider/crawling scan"""
        print("🕷️  Starting spider scan...")
        
        try:
            # Start spider scan
            scan_id = self.zap.spider.scan(self.target_url)
            print(f"   🆔 Spider scan ID: {scan_id}")
            
            # Monitor spider progress
            while int(self.zap.spider.status(scan_id)) < 100:
                progress = self.zap.spider.status(scan_id)
                print(f"   📈 Spider progress: {progress}%")
                time.sleep(5)
            
            print("✅ Spider scan completed")
            return True
            
        except Exception as e:
            print(f"❌ Spider scan error: {e}")
            return False

    def authentication_test(self):
        """Test authentication security"""
        print("🔐 Testing authentication security...")
        
        test_results = {
            'weak_passwords': [],
            'session_management': [],
            'csrf_protection': [],
            'sql_injection': []
        }
        
        try:
            # Test weak password attempts
            weak_passwords = ['password', '123456', 'admin', 'test', '']
            
            for weak_pass in weak_passwords:
                response = requests.post(
                    f"{self.target_url.replace(':3000', ':8000')}/api/auth/login",
                    json={'email': 'test@example.com', 'password': weak_pass},
                    timeout=10
                )
                
                if response.status_code == 200:
                    test_results['weak_passwords'].append(weak_pass)
            
            # Test session management
            if self.session_token:
                # Test token in URL
                response = requests.get(
                    f"{self.target_url}/dashboard?token={self.session_token}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    test_results['session_management'].append('Token exposed in URL')
            
            # Test CSRF protection
            csrf_test_data = {
                'email': 'csrf-test@example.com',
                'password': 'CsrfTest123!'
            }
            
            response = requests.post(
                f"{self.target_url.replace(':3000', ':8000')}/api/auth/register",
                json=csrf_test_data,
                headers={'Origin': 'http://malicious-site.com'},
                timeout=10
            )
            
            if response.status_code == 201:
                test_results['csrf_protection'].append('CSRF protection missing')
            
            # Test SQL injection
            sql_payloads = [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --"
            ]
            
            for payload in sql_payloads:
                response = requests.post(
                    f"{self.target_url.replace(':3000', ':8000')}/api/auth/login",
                    json={'email': payload, 'password': 'test'},
                    timeout=10
                )
                
                if 'error' in response.text.lower() and 'sql' in response.text.lower():
                    test_results['sql_injection'].append(f'SQL injection vulnerability: {payload}')
            
            print("✅ Authentication security tests completed")
            return test_results
            
        except Exception as e:
            print(f"❌ Authentication test error: {e}")
            return test_results

    def xss_test(self):
        """Test for XSS vulnerabilities"""
        print("🕵️  Testing for XSS vulnerabilities...")
        
        xss_payloads = [
            '<script>alert("XSS")</script>',
            '"><script>alert("XSS")</script>',
            "'><script>alert('XSS')</script>",
            'javascript:alert("XSS")',
            '<img src="x" onerror="alert(\'XSS\')">'
        ]
        
        vulnerable_endpoints = []
        
        try:
            # Test XSS in registration form
            for payload in xss_payloads:
                test_data = {
                    'name': payload,
                    'email': f'xss-test-{int(time.time())}@example.com',
                    'password': 'XssTest123!'
                }
                
                response = requests.post(
                    f"{self.target_url.replace(':3000', ':8000')}/api/auth/register",
                    json=test_data,
                    timeout=10
                )
                
                if payload in response.text:
                    vulnerable_endpoints.append(f'Registration form vulnerable to XSS: {payload}')
            
            # Test XSS in search/query parameters
            if self.session_token:
                search_endpoints = [
                    '/api/sites',
                    '/api/analytics/overview'
                ]
                
                for endpoint in search_endpoints:
                    for payload in xss_payloads:
                        response = requests.get(
                            f"{self.target_url.replace(':3000', ':8000')}{endpoint}?search={payload}",
                            headers={'Authorization': f'Bearer {self.session_token}'},
                            timeout=10
                        )
                        
                        if payload in response.text:
                            vulnerable_endpoints.append(f'{endpoint} vulnerable to XSS: {payload}')
            
            print(f"✅ XSS testing completed - Found {len(vulnerable_endpoints)} vulnerabilities")
            return vulnerable_endpoints
            
        except Exception as e:
            print(f"❌ XSS test error: {e}")
            return vulnerable_endpoints

    def generate_reports(self):
        """Generate security test reports"""
        print("📊 Generating security reports...")
        
        try:
            # Get scan results
            alerts = self.zap.core.alerts()
            
            # Generate JSON report
            json_report = {
                'timestamp': datetime.now().isoformat(),
                'target_url': self.target_url,
                'total_alerts': len(alerts),
                'alerts': alerts,
                'summary': {
                    'high_risk': len([a for a in alerts if a['risk'] == 'High']),
                    'medium_risk': len([a for a in alerts if a['risk'] == 'Medium']),
                    'low_risk': len([a for a in alerts if a['risk'] == 'Low']),
                    'informational': len([a for a in alerts if a['risk'] == 'Informational'])
                }
            }
            
            # Save JSON report
            json_file = f"{self.report_dir}/security-report-{int(time.time())}.json"
            with open(json_file, 'w') as f:
                json.dump(json_report, f, indent=2)
            
            # Generate HTML report
            html_report = self.zap.core.htmlreport()
            html_file = f"{self.report_dir}/security-report-{int(time.time())}.html"
            with open(html_file, 'w') as f:
                f.write(html_report)
            
            # Generate XML report
            xml_report = self.zap.core.xmlreport()
            xml_file = f"{self.report_dir}/security-report-{int(time.time())}.xml"
            with open(xml_file, 'w') as f:
                f.write(xml_report)
            
            print(f"✅ Reports generated:")
            print(f"   📄 JSON: {json_file}")
            print(f"   🌐 HTML: {html_file}")
            print(f"   📋 XML: {xml_file}")
            
            # Print summary
            summary = json_report['summary']
            print(f"\n🛡️  Security Scan Summary:")
            print(f"   🔴 High Risk: {summary['high_risk']}")
            print(f"   🟡 Medium Risk: {summary['medium_risk']}")
            print(f"   🟢 Low Risk: {summary['low_risk']}")
            print(f"   ℹ️  Informational: {summary['informational']}")
            
            return json_report
            
        except Exception as e:
            print(f"❌ Report generation error: {e}")
            return None

    def run_full_security_scan(self):
        """Run complete security test suite"""
        print("🚀 Starting comprehensive security scan...")
        
        start_time = time.time()
        results = {
            'start_time': datetime.now().isoformat(),
            'target_url': self.target_url,
            'tests_completed': [],
            'tests_failed': [],
            'vulnerabilities_found': []
        }
        
        # Setup authentication
        if self.setup_authentication():
            results['tests_completed'].append('authentication_setup')
        else:
            results['tests_failed'].append('authentication_setup')
        
        # Spider scan
        if self.spider_scan():
            results['tests_completed'].append('spider_scan')
        else:
            results['tests_failed'].append('spider_scan')
        
        # Passive scan
        if self.passive_scan():
            results['tests_completed'].append('passive_scan')
        else:
            results['tests_failed'].append('passive_scan')
        
        # Active scan
        if self.active_scan():
            results['tests_completed'].append('active_scan')
        else:
            results['tests_failed'].append('active_scan')
        
        # Authentication tests
        auth_results = self.authentication_test()
        if auth_results:
            results['tests_completed'].append('authentication_test')
            results['vulnerabilities_found'].extend([
                f"Weak passwords accepted: {auth_results['weak_passwords']}",
                f"Session management issues: {auth_results['session_management']}",
                f"CSRF protection issues: {auth_results['csrf_protection']}",
                f"SQL injection vulnerabilities: {auth_results['sql_injection']}"
            ])
        else:
            results['tests_failed'].append('authentication_test')
        
        # XSS tests
        xss_results = self.xss_test()
        if xss_results:
            results['tests_completed'].append('xss_test')
            results['vulnerabilities_found'].extend(xss_results)
        else:
            results['tests_failed'].append('xss_test')
        
        # Generate reports
        report_data = self.generate_reports()
        if report_data:
            results['tests_completed'].append('report_generation')
            results['zap_alerts'] = report_data['summary']
        else:
            results['tests_failed'].append('report_generation')
        
        # Calculate test duration
        end_time = time.time()
        results['duration_seconds'] = int(end_time - start_time)
        results['end_time'] = datetime.now().isoformat()
        
        # Save final results
        results_file = f"{self.report_dir}/security-test-results-{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n🎯 Security Testing Complete!")
        print(f"   ⏱️  Duration: {results['duration_seconds']} seconds")
        print(f"   ✅ Tests Completed: {len(results['tests_completed'])}")
        print(f"   ❌ Tests Failed: {len(results['tests_failed'])}")
        print(f"   🚨 Vulnerabilities Found: {len(results['vulnerabilities_found'])}")
        print(f"   📄 Results saved to: {results_file}")
        
        return results


def main():
    """Main security testing function"""
    target_url = os.getenv('SECURITY_TEST_URL', 'http://localhost:3000')
    zap_proxy = os.getenv('ZAP_PROXY', '127.0.0.1:8080')
    
    # Check if ZAP is running
    try:
        response = requests.get(f'http://{zap_proxy}', timeout=5)
        print("✅ OWASP ZAP is running")
    except requests.exceptions.RequestException:
        print("❌ OWASP ZAP is not running. Please start ZAP first.")
        print("   Run: docker run -u zap -p 8080:8080 -i owasp/zap2docker-stable zap.sh -daemon -host 0.0.0.0 -port 8080")
        sys.exit(1)
    
    # Initialize security tester
    security_tester = SecurityTester(target_url, zap_proxy)
    
    # Run comprehensive security scan
    results = security_tester.run_full_security_scan()
    
    # Exit with appropriate code
    if results['tests_failed']:
        print(f"\n⚠️  Some security tests failed: {results['tests_failed']}")
        sys.exit(1)
    else:
        print("\n✅ All security tests completed successfully!")
        sys.exit(0)


if __name__ == '__main__':
    main()