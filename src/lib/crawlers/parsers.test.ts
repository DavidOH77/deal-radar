import { describe, expect, it } from "vitest";
import { parseAlgumon } from "./algumon";
import { parseElevenstXml } from "./elevenst";
import { parseEomisae } from "./eomisae";
import { parseFmkoreaBest, parseFmkoreaDetail } from "./fmkorea";
import { parseNaverShopping } from "./naver";
import { parsePpomppu } from "./ppomppu";

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

  it("ignores Eomisae ad placeholder cards", () => {
    const html = `
      <div class="card_el">
        <h3><a href="/fs/199000001">list_adsense</a></h3>
        <a class="hx" href="/fs/199000001">read</a>
      </div>`;
    expect(parseEomisae(html, collectedAt)).toEqual([]);
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
});
