/**
 * BAI Background Check API - Cloudflare Worker
 * Smart Scoring Algorithm v2.0
 */

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;
    
    var corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (path === "/health") {
      return new Response(JSON.stringify({ 
        status: "ok", 
        version: "smart-scoring-2.0", 
        chain: "Base", 
        api: "BlockScout" 
      }), { headers: corsHeaders });
    }
    
    if (path.startsWith("/check/")) {
      var address = path.replace("/check/", "").toLowerCase();
      
      if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Invalid wallet address" 
        }), { status: 400, headers: corsHeaders });
      }
      
      try {
        // Fetch up to 500 transactions for better analysis
        var apiUrl = "https://base.blockscout.com/api?module=account&action=txlist&address=" + address + "&page=1&offset=500&sort=desc";
        
        var response = await fetch(apiUrl, {
          headers: { "User-Agent": "BAI-Background-Check/2.0" }
        });
        
        var rawText = await response.text();
        var parsed;
        
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to parse API response",
            raw: rawText.substring(0, 500)
          }), { headers: corsHeaders });
        }
        
        var txs = parsed.result;
        if (!Array.isArray(txs)) txs = [];
        
        // ============================================
        // ENHANCED ANALYSIS
        // ============================================
        
        var volumeIn = 0;
        var volumeOut = 0;
        var lastTx = null;
        var firstTx = null;
        var uniqueAddresses = new Set();
        var contractInteractions = 0;
        var failedTxs = 0;
        var recentTxs = 0; // last 30 days
        var largeTxs = 0; // > 1 ETH
        var gasUsed = 0;
        var thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        var sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        var veryRecentTxs = 0; // last 7 days
        
        for (var i = 0; i < txs.length; i++) {
          var tx = txs[i];
          var value = parseFloat(tx.value) / 1e18;
          var txTime = parseInt(tx.timeStamp) * 1000;
          
          // Volume tracking
          if (tx.to && tx.to.toLowerCase() === address) {
            volumeIn += value;
          }
          if (tx.from && tx.from.toLowerCase() === address) {
            volumeOut += value;
          }
          
          // First/last tx
          if (!lastTx) lastTx = tx;
          firstTx = tx;
          
          // Unique addresses interacted with
          if (tx.to) uniqueAddresses.add(tx.to.toLowerCase());
          if (tx.from) uniqueAddresses.add(tx.from.toLowerCase());
          
          // Contract interactions (has input data beyond 0x)
          if (tx.input && tx.input.length > 10) {
            contractInteractions++;
          }
          
          // Failed transactions
          if (tx.isError === "1" || tx.txreceipt_status === "0") {
            failedTxs++;
          }
          
          // Recent activity
          if (txTime > thirtyDaysAgo) recentTxs++;
          if (txTime > sevenDaysAgo) veryRecentTxs++;
          
          // Large transactions
          if (value > 1) largeTxs++;
          
          // Gas usage
          gasUsed += parseInt(tx.gasUsed || 0);
        }
        
        // Remove self from unique addresses
        uniqueAddresses.delete(address);
        
        // ============================================
        // SMART SCORING ALGORITHM
        // ============================================
        
        var scores = {
          activity: 0,      // 0-25 points
          longevity: 0,     // 0-20 points
          volume: 0,        // 0-20 points
          diversity: 0,     // 0-15 points
          sophistication: 0, // 0-10 points
          reliability: 0     // 0-10 points
        };
        
        var flags = [];
        var positives = [];
        var analysis = {};
        
        if (txs.length === 0) {
          // No transactions at all
          var result = {
            success: true,
            data: {
              address: address,
              generatedAt: new Date().toISOString(),
              chain: "Base",
              ethPriceUsd: "2500.00",
              trustScore: 0,
              trustLevel: "NO DATA",
              scoreBreakdown: { activity: 0, longevity: 0, volume: 0, diversity: 0, sophistication: 0, reliability: 0 },
              lastTransaction: null,
              transactionCount: 0,
              walletAge: null,
              volumeIn: { eth: "0.0000", usd: "0.00" },
              volumeOut: { eth: "0.0000", usd: "0.00" },
              flags: ["No transaction history on Base chain"],
              positives: [],
              analysis: { summary: "This wallet has no activity on Base chain." }
            }
          };
          return new Response(JSON.stringify(result), { headers: corsHeaders });
        }
        
        // ----- ACTIVITY SCORE (0-25) -----
        // Based on transaction count and recent activity
        if (txs.length >= 200) {
          scores.activity = 25;
          positives.push("Very high activity (" + txs.length + " transactions)");
        } else if (txs.length >= 100) {
          scores.activity = 20;
          positives.push("High activity (" + txs.length + " transactions)");
        } else if (txs.length >= 50) {
          scores.activity = 15;
          positives.push("Good activity (" + txs.length + " transactions)");
        } else if (txs.length >= 20) {
          scores.activity = 10;
        } else if (txs.length >= 5) {
          scores.activity = 5;
        } else {
          scores.activity = 2;
          flags.push("Very low transaction count (" + txs.length + ")");
        }
        
        // Bonus for recent activity
        if (veryRecentTxs >= 10) {
          scores.activity = Math.min(25, scores.activity + 3);
          positives.push("Very active in last 7 days (" + veryRecentTxs + " txs)");
        } else if (recentTxs >= 10) {
          scores.activity = Math.min(25, scores.activity + 2);
        }
        
        // Penalty for dormant wallet
        if (lastTx) {
          var daysSinceLastTx = Math.floor((Date.now() - (parseInt(lastTx.timeStamp) * 1000)) / 86400000);
          if (daysSinceLastTx > 180) {
            scores.activity = Math.max(0, scores.activity - 10);
            flags.push("Dormant wallet (no activity in " + daysSinceLastTx + " days)");
          } else if (daysSinceLastTx > 90) {
            scores.activity = Math.max(0, scores.activity - 5);
            flags.push("Inactive for " + daysSinceLastTx + " days");
          }
        }
        
        // ----- LONGEVITY SCORE (0-20) -----
        var walletAgeDays = 0;
        if (firstTx) {
          walletAgeDays = Math.floor((Date.now() - (parseInt(firstTx.timeStamp) * 1000)) / 86400000);
          
          if (walletAgeDays >= 365) {
            scores.longevity = 20;
            positives.push("Established wallet (" + Math.floor(walletAgeDays / 365) + "+ years old)");
          } else if (walletAgeDays >= 180) {
            scores.longevity = 15;
            positives.push("Wallet age: " + walletAgeDays + " days");
          } else if (walletAgeDays >= 90) {
            scores.longevity = 10;
          } else if (walletAgeDays >= 30) {
            scores.longevity = 5;
          } else if (walletAgeDays >= 7) {
            scores.longevity = 2;
            flags.push("Relatively new wallet (" + walletAgeDays + " days)");
          } else {
            scores.longevity = 0;
            flags.push("⚠️ Very new wallet (less than 7 days old)");
          }
        }
        
        // ----- VOLUME SCORE (0-20) -----
        var totalVolume = volumeIn + volumeOut;
        
        if (totalVolume >= 100) {
          scores.volume = 20;
          positives.push("High volume trader (" + totalVolume.toFixed(2) + " ETH total)");
        } else if (totalVolume >= 50) {
          scores.volume = 15;
        } else if (totalVolume >= 10) {
          scores.volume = 10;
        } else if (totalVolume >= 1) {
          scores.volume = 5;
        } else if (totalVolume >= 0.1) {
          scores.volume = 2;
        } else {
          scores.volume = 0;
          flags.push("Very low volume (< 0.1 ETH total)");
        }
        
        // Check for suspicious patterns
        var volumeRatio = volumeOut > 0 ? volumeIn / volumeOut : volumeIn > 0 ? 999 : 0;
        if (volumeRatio > 10 && volumeIn > 5) {
          flags.push("⚠️ Mostly receives funds (possible drain wallet)");
          scores.volume = Math.max(0, scores.volume - 5);
        } else if (volumeRatio < 0.1 && volumeOut > 5) {
          flags.push("⚠️ Mostly sends funds (possible distribution wallet)");
        }
        
        // ----- DIVERSITY SCORE (0-15) -----
        var uniqueCount = uniqueAddresses.size;
        
        if (uniqueCount >= 100) {
          scores.diversity = 15;
          positives.push("Highly diverse interactions (" + uniqueCount + " unique addresses)");
        } else if (uniqueCount >= 50) {
          scores.diversity = 12;
        } else if (uniqueCount >= 20) {
          scores.diversity = 8;
        } else if (uniqueCount >= 10) {
          scores.diversity = 5;
        } else if (uniqueCount >= 3) {
          scores.diversity = 2;
        } else {
          scores.diversity = 0;
          flags.push("Limited address diversity (interacted with only " + uniqueCount + " addresses)");
        }
        
        // ----- SOPHISTICATION SCORE (0-10) -----
        var contractRatio = txs.length > 0 ? contractInteractions / txs.length : 0;
        
        if (contractRatio >= 0.7) {
          scores.sophistication = 10;
          positives.push("Heavy smart contract user (" + Math.round(contractRatio * 100) + "% contract interactions)");
        } else if (contractRatio >= 0.4) {
          scores.sophistication = 7;
          positives.push("Regular DeFi/dApp user");
        } else if (contractRatio >= 0.2) {
          scores.sophistication = 4;
        } else if (contractInteractions >= 1) {
          scores.sophistication = 2;
        } else {
          scores.sophistication = 0;
        }
        
        // ----- RELIABILITY SCORE (0-10) -----
        var failRate = txs.length > 0 ? failedTxs / txs.length : 0;
        
        if (failRate === 0) {
          scores.reliability = 10;
          if (txs.length >= 20) positives.push("Perfect transaction success rate");
        } else if (failRate < 0.05) {
          scores.reliability = 8;
        } else if (failRate < 0.1) {
          scores.reliability = 5;
        } else if (failRate < 0.2) {
          scores.reliability = 2;
          flags.push("Elevated failed transaction rate (" + Math.round(failRate * 100) + "%)");
        } else {
          scores.reliability = 0;
          flags.push("⚠️ High failed transaction rate (" + Math.round(failRate * 100) + "%)");
        }
        
        // ============================================
        // CALCULATE FINAL SCORE
        // ============================================
        
        var trustScore = scores.activity + scores.longevity + scores.volume + 
                         scores.diversity + scores.sophistication + scores.reliability;
        
        // Cap at 100
        if (trustScore > 100) trustScore = 100;
        
        // Determine trust level
        var trustLevel = "UNKNOWN";
        if (trustScore >= 85) trustLevel = "EXCELLENT";
        else if (trustScore >= 70) trustLevel = "HIGH";
        else if (trustScore >= 55) trustLevel = "GOOD";
        else if (trustScore >= 40) trustLevel = "MODERATE";
        else if (trustScore >= 25) trustLevel = "LOW";
        else if (trustScore >= 10) trustLevel = "VERY LOW";
        else trustLevel = "MINIMAL";
        
        // Build last transaction info
        var lastTransaction = null;
        if (lastTx) {
          var txDate = new Date(parseInt(lastTx.timeStamp) * 1000);
          var txValue = parseFloat(lastTx.value) / 1e18;
          lastTransaction = {
            hash: lastTx.hash,
            timestamp: txDate.toISOString(),
            value: txValue.toFixed(6) + " ETH",
            usdValue: (txValue * 2500).toFixed(2),
            type: lastTx.from.toLowerCase() === address ? "OUT" : "IN"
          };
        }
        
        // Build analysis summary
        var summaryParts = [];
        if (trustScore >= 70) {
          summaryParts.push("This wallet shows strong legitimacy indicators.");
        } else if (trustScore >= 40) {
          summaryParts.push("This wallet shows moderate activity with some considerations.");
        } else {
          summaryParts.push("This wallet shows limited activity - proceed with caution.");
        }
        
        if (walletAgeDays >= 180 && txs.length >= 50) {
          summaryParts.push("Long history with consistent usage patterns.");
        }
        if (contractRatio >= 0.5) {
          summaryParts.push("Active DeFi/dApp participant.");
        }
        if (flags.length > 0) {
          summaryParts.push("Review flagged items below.");
        }
        
        analysis = {
          summary: summaryParts.join(" "),
          transactionsAnalyzed: txs.length,
          recentActivity: recentTxs + " transactions in last 30 days",
          uniqueCounterparties: uniqueCount,
          contractInteractionRate: Math.round(contractRatio * 100) + "%",
          failedTransactionRate: Math.round(failRate * 100) + "%"
        };
        
        var ethPrice = 2500;
        
        var result = {
          success: true,
          data: {
            address: address,
            generatedAt: new Date().toISOString(),
            chain: "Base",
            ethPriceUsd: ethPrice.toFixed(2),
            trustScore: trustScore,
            trustLevel: trustLevel,
            scoreBreakdown: scores,
            lastTransaction: lastTransaction,
            transactionCount: txs.length,
            walletAge: walletAgeDays + " days",
            volumeIn: { eth: volumeIn.toFixed(4), usd: (volumeIn * ethPrice).toFixed(2) },
            volumeOut: { eth: volumeOut.toFixed(4), usd: (volumeOut * ethPrice).toFixed(2) },
            flags: flags,
            positives: positives,
            analysis: analysis
          }
        };
        
        return new Response(JSON.stringify(result), { headers: corsHeaders });
        
      } catch (err) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: err.message
        }), { status: 500, headers: corsHeaders });
      }
    }
    
    return new Response(JSON.stringify({
      name: "BAI Background Check API",
      version: "smart-scoring-2.0",
      endpoints: ["/health", "/check/{address}"]
    }), { headers: corsHeaders });
  }
};