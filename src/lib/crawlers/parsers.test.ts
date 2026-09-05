import { describe, expect, it } from "vitest";
import { parseAlgumon } from "./algumon";
import { parseElevenstXml } from "./elevenst";
import { completeEomisaeTitle, parseEomisae, parseEomisaeDetail } from "./eomisae";
import { parseFmkoreaBest, parseFmkoreaDetail } from "./fmkorea";
import { parseNaverShopping } from "./naver";
import { parsePpomppu } from "./ppomppu";
import { parseQuasarzoneWebSearch } from "./quasarzone";
import { parseTheqoo, parseTheqooDetail } from "./theqoo";
import { parseWomencity, parseWomencityDetail } from "./womencity";

const collectedAt = "2026-08-22T13:00:00.000Z";

describe("source parsers", () => {
  it("parses Algumon JSON-LD reaction counters", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      mainEntity: {
        itemListElement: [{
          item: {
            name: "스파클 500ml 생수 80병",
            url: "https://www.algumon.com/n/deal/1027663",
            image: "https://cdn.algumon.com/image.jpeg",
            dateCreated: "2026-08-22T22:03:59+09:00",
            interactionStatistic: [
              { interactionType: "https://schema.org/WantAction", userInteractionCount: 21 },
              { interactionType: "https://schema.org/CommentAction", userInteractionCount: 4 }
            ]
          }
        }]
      }
    })}</script>`;
    const [deal] = parseAlgumon(html, collectedAt);
    expect(deal).toMatchObject({
      sourceDealId: "1027663",
      reactions: { likes: 21, comments: 4 }
    });
  });

  it("enriches Algumon JSON-LD with seller, price, and shipping from the public card", () => {
    const html = `
      <article class="deal-feed-card">
        <a class="badge" href="/n/deal?keyword=G%EB%A7%88%EC%BC%93">G마켓</a>
        <span class="badge">뽐뿌</span>
        <a href="/n/d/1030216">산지직송 고당도 샤인머스켓 2kg 3~4수</a>
        <p class="deal-price-text">12,880원 (2 x 6,440원)</p>
        <span>배송 무료</span>
        <a href="/n/deal/1030216">공유</a>
      </article>
      <script type="application/ld+json">${JSON.stringify({
        mainEntity: {
          itemListElement: [{
            item: {
              name: "산지직송 고당도 샤인머스켓 2kg 3~4수",
              url: "https://www.algumon.com/n/deal/1030216",
              dateCreated: "2026-08-28T01:14:12+09:00"
            }
          }]
        }
      })}</script>`;

    expect(parseAlgumon(html, collectedAt)[0]).toMatchObject({
      title: "[G마켓] 산지직송 고당도 샤인머스켓 2kg 3~4수",
      dealPrice: { amount: 12_880 },
      freeShipping: true
    });
  });

  it("parses paid Algumon shipping without mixing it into the deal price", () => {
    const html = `
      <article class="deal-feed-card">
        <a class="badge">11번가</a>
        <p class="deal-price-text">9,900원</p>
        <span>배송 3,000원</span>
        <a href="/n/deal/1030300">공유</a>
      </article>
      <script type="application/ld+json">${JSON.stringify({
        mainEntity: { itemListElement: [{ item: {
          name: "테스트 상품",
          url: "https://www.algumon.com/n/deal/1030300"
        } }] }
      })}</script>`;

    expect(parseAlgumon(html, collectedAt)[0]).toMatchObject({
      dealPrice: { amount: 9_900 },
      shippingPrice: { amount: 3_000 }
    });
  });

  it("parses Eomisae cards without profile metrics leaking in", () => {
    const html = `
      <div class="card_el">
        <div class="card_content">
          <p><span class="cate">패션국내,</span><span>26.08.22</span></p>
          <h3><a href="/fs/199029772">피그먼트 스웻셔츠 8290원</a></h3>
          <div class="infos">
            <span><i class="ion-ios-eye"></i>4652</span>
            <span><i class="ion-ios-chatbubble"></i>3</span>
            <span><i class="ion-ios-heart"></i>31</span>
          </div>
        </div>
        <a class="hx" href="/fs/199029772">read</a>
      </div>`;
    const [deal] = parseEomisae(html, collectedAt);
    expect(deal).toMatchObject({
      sourceDealId: "199029772",
      category: "패션국내",
      reactions: { views: 4652, comments: 3, likes: 31 }
    });
  });

  it("uses the Eomisae thumbnail timestamp when it matches the listed date", () => {
    const html = `
      <div class="card_el">
        <img class="tmb" src="//img.eomisae.co.kr/files/thumbnails/951/748/200/190x190.crop.jpg?t=1788530791" />
        <div class="card_content">
          <p><span class="cate">패션국내,</span><span>26.09.04</span></p>
          <h3><a href="/fs/200748951">DTHIRTYONE 크루넥 스웨트셔츠</a></h3>
        </div>
        <a class="hx" href="/fs/200748951">read</a>
      </div>`;

    expect(parseEomisae(html, "2026-09-04T17:36:22.728Z")[0].publishedAt)
      .toBe("2026-09-04T14:06:31.000Z");
  });

  it("falls back to the listed Eomisae date when the thumbnail timestamp is inconsistent", () => {
    const html = `
      <div class="card_el">
        <img class="tmb" src="//img.eomisae.co.kr/files/thumbnails/example.jpg?t=1788530791" />
        <div class="card_content">
          <p><span class="cate">패션국내,</span><span>26.09.03</span></p>
          <h3><a href="/fs/200748952">테스트 상품</a></h3>
        </div>
        <a class="hx" href="/fs/200748952">read</a>
      </div>`;

    expect(parseEomisae(html, "2026-09-04T17:36:22.728Z")[0].publishedAt)
      .toBe("2026-09-03T03:00:00.000Z");
  });

  it("ignores Eomisae ad placeholder cards", () => {
    const html = `
      <div class="card_el">
        <h3><a href="/fs/199000001">list_adsense</a></h3>
        <a class="hx" href="/fs/199000001">read</a>
      </div>
      <div class="card_el">
        <h3><a href="/fs/199000002">list_ad_link</a></h3>
        <a class="hx" href="/fs/199000002">read</a>
      </div>`;
    expect(parseEomisae(html, collectedAt)).toEqual([]);
  });

  it("parses the complete Eomisae title from a public detail page", () => {
    const html = `
      <meta property="og:title" content="불스원 그라스 블루 차량용방향제 100ml, 1+1, 16,900원 - 인기정보 - 어미새" />`;

    expect(parseEomisaeDetail(html))
      .toBe("불스원 그라스 블루 차량용방향제 100ml, 1+1, 16,900원");
    expect(completeEomisaeTitle(
      "불스원 그라스 블루 차량용방향제 100ml, 1+1, 16...",
      parseEomisaeDetail(html)
    )).toBe("불스원 그라스 블루 차량용방향제 100ml, 1+1, 16,900원");
  });

  it("keeps the listed Eomisae title when detail content does not match", () => {
    expect(completeEomisaeTitle("불스원 차량용방향제 16...", "다른 상품 16,900원"))
      .toBe("불스원 차량용방향제 16...");
  });

  it("parses 11st official product-search XML", () => {
    const xml = `<Products><Product>
      <ProductCode>9179493622</ProductCode>
      <ProductName><![CDATA[오리온 치킨팝 10개]]></ProductName>
      <ProductPrice>12900</ProductPrice><SalePrice>8900</SalePrice>
      <BasicImage>https://cdn.011st.com/item.webp</BasicImage>
      <DetailPageUrl>https://www.11st.co.kr/products/9179493622</DetailPageUrl>
      <CategoryName>과자/간식</CategoryName>
    </Product></Products>`;
    const [deal] = parseElevenstXml(xml, collectedAt);
    expect(deal).toMatchObject({
      sourceDealId: "9179493622",
      dealPrice: { amount: 8900 },
      sellerReferencePrice: { amount: 12900 }
    });
  });

  it("parses hot deals surfaced on the robots-allowed FMKorea best page", () => {
    const html = `
      <li class="li li_best2_hotdeal1">
        <a href="/10245343816?x9=1" class="pc_voted_count"><span class="count">39</span></a>
        <h3 class="title"><a href="/10245343816?x9=1">
          <span class="ellipsis-target">[오늘의집] 오뚜기 피자 4개 (19,200원) (무료)</span>
          <span class="comment_count">[120]</span>
        </a></h3>
      </li>`;
    const [deal] = parseFmkoreaBest(html, collectedAt);
    expect(deal).toMatchObject({
      source: "fmkorea",
      sourceDealId: "10245343816",
      reactions: { likes: 39, comments: 120 }
    });
  });

  it("enriches FMKorea best deals with the detail image and seller URL", () => {
    const detail = parseFmkoreaDetail(`
      <meta property="og:image" content="https://image.fmkorea.com/product.jpg">
      <div class="pop_more"><a class="category">먹거리</a></div>
      <div class="rd_hd">
        <span class="date">2026.08.23 00:07</span>
        <div class="btm_area"><div class="side fr">
          <span>조회 수 <b>109290</b></span><span>추천 수 <b>39</b></span><span>댓글 <b>123</b></span>
        </div></div>
      </div>
      <table class="hotdeal_table"><tr><td><a class="hotdeal_url" href="https://store.example/product">상품</a></td></tr></table>
    `);
    expect(detail).toMatchObject({
      imageUrl: "https://image.fmkorea.com/product.jpg",
      productUrl: "https://store.example/product",
      category: "먹거리",
      publishedAt: "2026-08-22T15:07:00.000Z",
      reactions: { views: 109290, likes: 39, comments: 123 }
    });
  });

  it("parses Ppomppu list reactions and listing timestamps", () => {
    const html = `
      <table><tr class="baseList">
        <td class="baseList-numb">728778</td>
        <td class="title">
          <a class="baseList-thumb" href="view.php?id=ppomppu&no=728778"><img src="//cdn2.ppomppu.co.kr/item.jpg"></a>
          <a class="baseList-title" href="view.php?id=ppomppu&no=728778"><span>[11번가] 한돈 1KG (17,800원/무료)</span></a>
          <span class="baseList-c">2</span><small class="baseList-small">[식품/건강]</small>
        </td>
        <td title="26.08.23 20:44:11"><time>20:44:11</time></td>
        <td class="baseList-rec">4 - 1</td><td class="baseList-views">564</td>
      </tr></table>`;
    const [deal] = parsePpomppu(html, collectedAt);
    expect(deal).toMatchObject({
      source: "ppomppu",
      sourceDealId: "728778",
      category: "식품/건강",
      publishedAt: "2026-08-23T11:44:11.000Z",
      reactions: { likes: 4, comments: 2, views: 564 }
    });
  });

  it("parses deal-only rows from Theqoo's Theqdeal board", () => {
    const html = `<table><tbody class="hide_notice">
      <tr class="notice"><td class="title"><a href="/theqdeal/1">공지</a></td></tr>
      <tr>
        <td class="no">34391</td><td class="cate">생활용품</td>
        <td class="title">
          <a class="preface" href="/theqdeal?group_srl=1">쿠팡)</a>
          <a href="/theqdeal/4324107906?filter_mode=hot">딥슬립 수면 베개 1+1</a>
          <span>(12,500원)</span><a class="replyNum">3</a>
        </td>
        <td class="time">20:29</td><td class="m_no">1,001</td>
      </tr>
    </tbody></table>`;
    const [deal] = parseTheqoo(html, "2026-08-24T13:00:00.000Z");
    expect(deal).toMatchObject({
      source: "theqoo",
      sourceDealId: "4324107906",
      title: "[쿠팡] 딥슬립 수면 베개 1+1 (12,500원)",
      category: "생활용품",
      publishedAt: "2026-08-24T11:29:00.000Z",
      dealPrice: { amount: 12_500 },
      reactions: { comments: 3, views: 1_001 }
    });
  });

  it("keeps Theqoo's affiliate redirect while enriching price and image", () => {
    const detail = parseTheqooDetail(`
      <div class="rd_hd"><div class="btm_area"><div class="side fr"><span>2026.08.24 20:29</span></div></div></div>
      <table class="et_vars">
        <tr><th>상품링크</th><td><a href="/index.php?act=procTheqooRedirectLink&amp;target=4324107906">상품</a></td></tr>
        <tr><th>가격</th><td>12,500원</td></tr>
      </table>
      <article><div class="xe_content"><img src="https://img-cdn.theqoo.net/item.jpg"></div></article>
    `);
    expect(detail).toMatchObject({
      imageUrl: "https://img-cdn.theqoo.net/item.jpg",
      productUrl: "https://theqoo.net/index.php?act=procTheqooRedirectLink&target=4324107906",
      dealPrice: { amount: 12_500 },
      publishedAt: "2026-08-24T11:29:00.000Z"
    });
  });

  it("parses public Women's Generation sale board metadata", () => {
    const html = `<script>var articles = [];
      articles.push({
        dataid: 23727,
        fldid: "WSmj",
        title: "쿠팡) 사푸토 &amp; 스트링 치즈 24개입 9580원",
        thumbnailImageUrl: "https://img1.daumcdn.net/thumb/item.jpg",
        viewCount: Number("5719"),
        commentCount: Number("34"),
        articleElapsedTime: "15:32"
      });
      articles.push({
        dataid: 23726,
        fldid: "WSmj",
        title: "❌️라이브 끝❌️ 네이버) 한우 14960원",
        viewCount: Number("2044"),
        commentCount: Number("69"),
        articleElapsedTime: "11:19"
      });
      articles.push({
        dataid: 23716,
        fldid: "WSmj",
        title: "네이버 푸드페스타 선착순 ❌️소진❌️",
        viewCount: Number("3025"),
        commentCount: Number("16"),
        articleElapsedTime: "10시간 전"
      });
      articles.push({
        dataid: 23713,
        fldid: "WSmj",
        title: "Re: 페이코도됨",
        viewCount: Number("1145"),
        commentCount: Number("0"),
        articleElapsedTime: "23시간 전"
      });
    </script>`;
    const deals = parseWomencity(html, "2026-08-24T13:00:00.000Z");
    expect(deals).toHaveLength(4);
    expect(deals[1]).toMatchObject({
      sourceDealId: "23726",
      expiresAt: "2026-08-24T13:00:00.000Z"
    });
    expect(deals[2]).toMatchObject({
      sourceDealId: "23716",
      expiresAt: "2026-08-24T13:00:00.000Z"
    });
    expect(deals[3]).toMatchObject({
      sourceDealId: "23713",
      expiresAt: "2026-08-24T13:00:00.000Z"
    });
    const [deal] = deals;
    expect(deal).toMatchObject({
      source: "womencity",
      sourceDealId: "23727",
      title: "[쿠팡] 사푸토 & 스트링 치즈 24개입 9580원",
      imageUrl: "https://img1.daumcdn.net/thumb/item.jpg",
      category: "세일정보",
      publishedAt: "2026-08-24T06:32:00.000Z",
      reactions: { comments: 34, views: 5719 }
    });
  });

  it("extracts a public seller link and refreshed reactions from Women's Generation detail", () => {
    const detail = parseWomencityDetail(`
      <meta property="og:image" content="https://t1.daumcdn.net/cafeattach/item.jpg">
      <article id="mArticle">
        <span class="txt_subject"><span class="sr_only">작성시간</span>15:32<span class="txt_bar">|</span><span class="sr_only">조회수</span>5,720</span>
        <a class="link_cmt"><span class="num_cmt">34</span></a>
        <div id="article"><a href="https://store.example/products/1">상품</a></div>
      </article>
    `, "2026-08-24T13:00:00.000Z");
    expect(detail).toMatchObject({
      imageUrl: "https://t1.daumcdn.net/cafeattach/item.jpg",
      productUrl: "https://store.example/products/1",
      publishedAt: "2026-08-24T06:32:00.000Z",
      reactions: { comments: 34, views: 5720 }
    });
  });

  it("parses Naver Shopping API products without treating the high price as a baseline", () => {
    const [deal] = parseNaverShopping({
      items: [{
        title: "<b>삼다수</b> 2L 12병",
        link: "https://search.shopping.naver.com/catalog/123",
        image: "https://shopping-phinf.pstatic.net/main_123.jpg",
        lprice: "10900",
        productId: "123",
        mallName: "네이버",
        category1: "식품",
        category2: "생수"
      }]
    }, collectedAt);
    expect(deal).toMatchObject({
      source: "naver",
      sourceDealId: "123",
      title: "삼다수 2L 12병",
      dealPrice: { amount: 10900 },
      category: "식품 · 생수"
    });
    expect(deal.sellerReferencePrice).toBeUndefined();
  });

  it("accepts only dated Quasarzone hot-deal results from the official web search API", () => {
    const deals = parseQuasarzoneWebSearch({
      items: [{
        title: "<b>진행중</b> [11번가] OLED 모니터 특가 &gt; 핫딜 | 퀘이사존 QUASARZONE",
        link: "https://quasarzone.com/bbs/qb_saleinfo/views/1976683?device=mobile&page=1",
        description: "2026.08.10 00:27 판매처 11번가 가격 ￦ 199,000 (KRW) 배송비/직배 무료 댓글: 7 개"
      }, {
        title: "날짜 없는 오래된 검색 결과 > 핫딜 | 퀘이사존 QUASARZONE",
        link: "https://quasarzone.com/bbs/qb_saleinfo/views/1900000",
        description: "게시 시각을 확인할 수 없습니다."
      }, {
        title: "퀘이사존과 무관한 결과",
        link: "https://example.com/bbs/qb_saleinfo/views/1976684",
        description: "2026.08.10 00:28"
      }]
    }, collectedAt);

    expect(deals).toHaveLength(1);
    expect(deals[0]).toMatchObject({
      source: "quasarzone",
      sourceMode: "official_api",
      sourceDealId: "1976683",
      title: "[11번가] OLED 모니터 특가",
      sourceUrl: "https://quasarzone.com/bbs/qb_saleinfo/views/1976683",
      publishedAt: "2026-08-09T15:27:00.000Z",
      dealPrice: { amount: 199_000, currency: "KRW" },
      freeShipping: true,
      reactions: { comments: 7 }
    });
  });
});
