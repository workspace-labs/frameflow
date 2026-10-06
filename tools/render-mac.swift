// Builder's tool, macOS only: opens a storyboard page in WebKit (Safari's engine), waits for frameflow to
// finish, then writes each page as a PNG and the whole storyboard as a printed PDF.
// Usage (through render-mac.sh): render-mac <storyboard.html> <out-dir>
// Exit 0 = ready, 2 = the page refused (the problems are printed), 1 = the tool failed.
import Cocoa
import WebKit

final class Renderer: NSObject, WKNavigationDelegate {
    let web: WKWebView
    let window: NSWindow
    let out: URL
    let page: URL
    var tries = 0

    init(page: URL, out: URL) {
        self.page = page
        self.out = out
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 900, height: 1200))
        window = NSWindow(contentRect: NSRect(x: -4000, y: 0, width: 900, height: 1200),
                          styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        window.contentView = web
        web.navigationDelegate = self
        web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent().deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { poll() }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail("load failed: \(error)") }

    func poll() {
        web.evaluateJavaScript("document.documentElement.getAttribute('data-frameflow')") { value, _ in
            let state = value as? String ?? ""
            if state == "ready" { self.ready() }
            else if state == "refused" { self.refused() }
            else if self.tries > 100 { self.fail("the page never finished (no data-frameflow after 20 s)") }
            else { self.tries += 1; DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { self.poll() } }
        }
    }

    func refused() {
        web.evaluateJavaScript("JSON.stringify(window.frameflowProblems || [])") { value, _ in
            print("REFUSED")
            print(value as? String ?? "[]")
            exit(2)
        }
    }

    func ready() {
        let js = "JSON.stringify({h: document.documentElement.scrollHeight, pages: [...document.querySelectorAll('.page')].map(p => { const r = p.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; })})"
        web.evaluateJavaScript(js) { value, _ in
            guard let text = value as? String, let data = text.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let h = obj["h"] as? Double, let pages = obj["pages"] as? [[Double]] else { return self.fail("could not measure the pages") }
            let size = NSSize(width: 900, height: h)
            self.window.setContentSize(size)
            self.web.setFrameSize(size)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.snap(pages, 0) }
        }
    }

    func snap(_ pages: [[Double]], _ i: Int) {
        if i == pages.count { return pdf(pages.count) }
        let r = pages[i]
        let config = WKSnapshotConfiguration()
        config.rect = NSRect(x: r[0], y: r[1], width: r[2], height: r[3])
        config.snapshotWidth = NSNumber(value: r[2] * 1.5)
        web.takeSnapshot(with: config) { image, error in
            guard let image = image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
                  let png = rep.representation(using: .png, properties: [:]) else { return self.fail("snapshot \(i + 1): \(String(describing: error))") }
            let file = self.out.appendingPathComponent(String(format: "page-%02d.png", i + 1))
            try? png.write(to: file)
            self.snap(pages, i + 1)
        }
    }

    func pdf(_ count: Int) {
        let info = NSPrintInfo()
        info.paperSize = NSSize(width: 595.28, height: 841.89)
        info.topMargin = 0; info.bottomMargin = 0; info.leftMargin = 0; info.rightMargin = 0
        info.horizontalPagination = .fit
        info.verticalPagination = .automatic
        info.jobDisposition = .save
        let file = out.appendingPathComponent("storyboard.pdf")
        info.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL] = file
        let op = web.printOperation(with: info)
        op.showsPrintPanel = false
        op.showsProgressPanel = false
        op.view?.frame = web.bounds
        op.runModal(for: window, delegate: self, didRun: #selector(printed(_:success:contextInfo:)), contextInfo: nil)
        print("READY \(count) pages")
    }

    @objc func printed(_ op: NSPrintOperation, success: Bool, contextInfo: UnsafeMutableRawPointer?) {
        print(success ? "PDF written" : "PDF failed")
        exit(success ? 0 : 1)
    }

    func fail(_ why: String) {
        FileHandle.standardError.write("render-mac: \(why)\n".data(using: .utf8)!)
        exit(1)
    }
}

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: render-mac <storyboard.html> <out-dir>\n".data(using: .utf8)!)
    exit(1)
}
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let renderer = Renderer(page: URL(fileURLWithPath: args[1]), out: URL(fileURLWithPath: args[2], isDirectory: true))
app.run()
