(async () => {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // 测试普通用户的文章列表API
    const publicArticlesResponse = await fetch('http://127.0.0.1:8800/api/articles?page=1&pageSize=10');
    const publicArticlesData = await publicArticlesResponse.json();
    console.log('普通文章列表API响应:', publicArticlesData);
    
    if (publicArticlesData.code === 200 && Array.isArray(publicArticlesData.data)) {
      console.log('\n文章数据:');
      publicArticlesData.data.forEach((article, index) => {
        console.log(`\n文章 ${index + 1}:`);
        console.log('标题:', article.title);
        console.log('查看数量:', article.viewCount);
        console.log('点赞数量:', article.likeCount);
        console.log('倒赞数量:', article.dislikeCount);
      });
    }
  } catch (error) {
    console.error('错误:', error);
  }
})();