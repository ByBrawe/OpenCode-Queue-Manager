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
