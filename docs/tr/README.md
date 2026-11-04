# OpenCode Queue Manager — Türkçe kurulum ve kullanım

**OpenCode v2 Desktop ve TUI için toplu mesaj kuyruğu yönetimi.** 100, 200 veya istediğiniz sayıda `devam et` mesajı oluşturun; alt alta listeleyin, düzenleyin, sıraya koyun ve yalnızca onayladığınızda OpenCode'un gerçek kuyruğuna gönderin.

> **Deneysel:** Desktop GUI eklenti API'si değişebilir. Otomatik testler çalışıyor ancak gerçek Desktop entegrasyon testi henüz tamamlanmadı. Kaynaktaki v0.3.0 kurulum aracı npm'de yayımlanana kadar `npx` komutlarında bulunmayabilir.

## En hızlı kurulum

OpenCode v2 CLI kuruluysa:

```powershell
opencode plugin add @bybrawe/opencode-queue-manager
```

OpenCode Desktop veya TUI'yi yeniden açın. Oturumda `/qm` komutunu kullanın ya da komut paletinden Queue Manager'ı arayın.

### Otomatik kurulum/kaldırma (v0.3.0 yayımlandıktan sonra)

```powershell
npx @bybrawe/opencode-queue-manager install
npx @bybrawe/opencode-queue-manager doctor
npx @bybrawe/opencode-queue-manager update
npx @bybrawe/opencode-queue-manager uninstall
```

CLI yüklü değilse Desktop için yalnızca ayar dosyasına ekleme/kaldırma:

```powershell
npx @bybrawe/opencode-queue-manager install --method config
npx @bybrawe/opencode-queue-manager uninstall --method config
```

Henüz npm'de bulunmayan kaynak sürümünü GitHub'dan klonladığınız klasörde şöyle çalıştırın:

```powershell
node .\bin\opencode-queue-manager.mjs install --dry-run
node .\bin\opencode-queue-manager.mjs install
```

OpenCode CLI'nin kendisini npm aracılığıyla kurmak için (Desktop uygulaması değildir):

```powershell
npx @bybrawe/opencode-queue-manager install-opencode --yes
```

Kaldırmak için `uninstall-opencode --yes` kullanabilirsiniz. Araç sadece npm'in küresel olarak kurduğu `@opencode/cli` paketini kaldırır; uygulama, projeler ve kullanıcı ayarları korunur. Desktop yüklemek için [resmî indirme sayfasını](https://opencode.ai/download) kullanın.

## Nasıl kullanılır?

1. OpenCode v2'de oturum açıp **Queue Manager** panelini açın.
2. `devam et` yazın, 100 / 200 / özel sayı seçin.
3. **Taslak listeyi** gözden geçirin. Arayın, düzenleyin, silin, yukarı/aşağı taşıyın.
4. **Native queue'ya gönder** komutunu onaylayın. Önce 2–3 mesajla test edin.
5. Gerçek kuyruk listesinden henüz çalışmayan mesajları iptal edebilirsiniz.

İşlem başladığında model çağrıları ve maliyetler oluşabilir. **Taslakları sıralamak, gerçek kuyruğun sırasını değiştirmez**. `Wrong workdir` hatasını tekrarlarla çözemezsiniz; önce proje dizinini düzeltin.

### Alt alta listeyle toplu görev örneği

```text
Projenin kök dizinini kontrol et.
Paketleri yükle ve testleri çalıştır.
Bulduğun hataları gider.
Kalan sorunları belgele ve tamamlandığında dur.
```

Bunu `.txt` dosyasından da içe aktarabilirsiniz. Her boş olmayan satır ayrı mesaj olur.

## DeepSeek ve diğer modeller

DeepSeek, OpenAI, Anthropic, OpenRouter vb. **model sağlayıcılarıdır**. OpenCode'da `/connect` ile sağlayıcınızı bağlayıp `/models` ile istediğiniz modeli seçin. Kuyruk yöneticisi seçilen modelden bağımsız çalışır; API anahtarlarınızı istemez. Başka **kodlama uygulamaları** için desteğin altyapısı hazır, fakat şu anda tek uygulanmış ana platform **OpenCode v2**. Desteklenmeyen uygulamalar için uyumluluk iddiasında bulunmuyoruz.

## SSS

**Desktop uygulamasını kuruyor mu?** İsteğe bağlı `install-opencode` yalnızca resmî OpenCode CLI'yi kurar. Desktop uygulaması ayrı indirilir.

**Sonradan silebilir miyim?** Evet: `opencode plugin remove @bybrawe/opencode-queue-manager` veya `npx ... uninstall`. OpenCode silinmez.

**Ayarlarım bozulur mu?** CLI varsa onun resmî plugin yöneticisi kullanılır. CLI yoksa ayar dosyası değiştirilmeden önce zaman damgalı yedek alınır. Başka `plugins` girdileri korunur.

**Büyük sayıda kuyruğa atmalı mıyım?** Sadece ihtiyaç kadar; maliyet ve yanlış iş dizini risklerini kontrol edin.

**Google'da nasıl görünür?** `docs/` klasörünü GitHub Pages ile yayımlayıp Google Search Console üzerinden site haritası gönderin. Google'da sıralama garantisi yoktur.

İngilizce ana rehber: [README](../../README.md) · [Gelişmiş kurulum](../en/installation.md) · [Örnekler](../en/examples.md).

## npm otomatik yayini

GitHub'da `main` dalina kod eklendiginde testler ve paket kontrolu calisir; surum npm'deki son surumle cakisirsa patch surumu kendiliginden artirilip OIDC ile npm'e yayimlanir. Manuel `npm login`, `npm version` veya `npm publish` gerekmez. GitHub Environment `npm` koruma kurallari onay gerektiriyorsa yayin bu onayi bekler.

**npm'e yayinlamak, kullanicinin cihazindaki eklentiyi kendiliginden yenilemez.** OpenCode v2 yeni surumleri kontrol eder, ancak yuklemeyi garanti etmez. Kullanici `opencode plugin update @bybrawe/opencode-queue-manager` komutuyla surumu guncelleyebilir. [Surum dokumani](../en/releasing.md).

## Windows sürüm algılama ve npm uyarıları

`opencode v2.0.22` gibi CLI sürümleri güncel kurulum aracı tarafından desteklenir. Yalnızca `npm i @bybrawe/opencode-queue-manager` çalıştırmak OpenCode içinde eklentiyi etkinleştirmez. `npx @bybrawe/opencode-queue-manager@latest install` ile OpenCode'a ekleyin; ardından `npx @bybrawe/opencode-queue-manager@latest doctor` çalıştırın. `doctor`, yapılandırma dosyasının yanında OpenCode'un eklenti listesini de sorgular.

`25 moderate vulnerabilities` gibi npm audit uyarıları çalıştırılan dizindeki **tüm** npm bağımlılıklarını kapsar. Ayrıntı için o dizinde `npm audit` çalıştırılabilir. Kullanıcı klasöründe körlemesine `npm audit fix --force` komutunu çalıştırmayın.


## Desktop'ta /qm çıkmıyorsa

Queue Manager, OpenCode v2 Desktop için `@opencode/plugin/gui/vite` ile hazırlanmış deneysel GUI bileşeni barındırır. Yalnızca `npm i` çalıştırmak Desktop'ta komut eklemez. `opencode plugin update @bybrawe/opencode-queue-manager` ile OpenCode'un kayıtlı paketini yenile, Desktop'ı yeniden başlat ve **Ayarlar → Eklentiler → Plugins** bölümünde Queue Manager'ın yüklendiğini ve GUI anahtarının açık olduğunu kontrol et. Oturum açtıktan sonra `/qm`, komut paletinden `Queue Manager` veya yan paneldeki `+` menüsünü kullan. Komut artık oturum yokken de görünür; kullanıldığında önce oturum açmanı ister. Background service / SQLite hatası varsa önce OpenCode servisini onar.


## Taslak sırasını kolay düzenleme

OpenCode Desktop'ta `/qm` komutuyla Queue Manager panelini aç. Taslak mesajlarının yanındaki **☑ kutuları** işaretle. **↑ Seçilileri yukarı** veya **↓ Seçilileri aşağı** ile topluca bir basamak taşı; **⇡ Başa** veya **⇣ Sona** ile topluca başa/sona taşı. **⠿ tutamacını** başka satırın üzerine sürükleyip bırakırsan tek mesajı veya işaretlediğin tüm mesajları birlikte taşırsın. Seçili mesajların kendi aralarındaki sıra bozulmaz. **Bu sayfayı seç** (sayfalı liste), **Eşleşenleri seç** (arama sonuçlarının tümü) ve **Tümünü seç** tuşları bulunur. Klavye ile Alt+↑/↓ ve Alt+Home/End de çalışır.

**Önemli:** Bunlar **henüz kuyruğa gönderilmemiş taslakları** sıralar. Gerçek OpenCode kuyruğuna alınmış mesajların sırasını sessizce değiştirmez veya çalışan modele müdahale etmez. Önce taslakları düzenleyip **Tümünü kuyruğa aktar** ile onayla.

## 20 dil desteği — Desktop

Queue Manager panelinin üst kısmındaki **Dil** menüsünden 20 dilden birini seçebilirsin. **OpenCode dilini kullan** seçeneğinde eklenti OpenCode Desktop'ın dilini izler. Manuel seçimin uygulama yeniden açıldığında ve farklı oturumlarda korunur. Arapça ve Farsçada sağdan sola görünüm kullanılır.

Çevrilenler: taslak ve gerçek kuyruk ekranları, toplu seçim, sürükle-bırak, düzenleme düğmeleri, onaylar, maliyet uyarıları ve açılır özellik özeti. **Mesajlarının içeriği otomatik çevrilmez veya değiştirilmez.** Nadir hata iletileri bazı dillerde İngilizceye dönebilir. **TUI'nin ayrı menüsü henüz 20 dilde değildir.**

[20 dilde ayrıntılı özellik açıklamaları](../languages/README.md) · [Çok dilli web rehberi](https://bybrawe.github.io/OpenCode-Queue-Manager/languages.html).
