"""
CoBuy Recommendation Service
Redesigning Association Analytics into an Actionable Business Advisory Engine.

Implements the Seven-Tier Layered Generation Architecture:
Layer 1: Transaction Ingestion
Layer 2: Analytics Engine (FP-Growth / Apriori raw association matrices)
Layer 3: Signal Interpretation (deltas, variance, velocity, catalog topology)
Layer 4: Strategic Categorization (GROW, SELL_MORE, WATCH, OPTIMIZE, REVIEW)
Layer 5: Dynamic Advice Synthesis (intelligent, non-repeating consultative phrasing)
Layer 6: Presentation DTO Serialization (strictly normalized BusinessRecommendation contract)
"""

import math
import hashlib
import time
import logging
from datetime import datetime, timedelta
import pandas as pd
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from transaction_encoder import TransactionEncoder
import db

logger = logging.getLogger(__name__)

MIN_TRANSACTIONS_THRESHOLD = 5

def generate_recommendation_id(category: str, items: list) -> str:
    """Generate a stable, immutable unique hash for a recommendation."""
    normalized_items = sorted([str(it).strip().lower() for it in items])
    raw_key = f"{category.upper()}:" + ":".join(normalized_items)
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()[:16]

def resolve_potential_badge(confidence: float, lift: float, support: float) -> str:
    """
    Derive potential ranking badge from mathematical association parameters:
    - Confidence (weight: 45%): Attachment strength. When customers buy Item A, how consistently
      do they also add Item B? E.g., confidence >= 0.80 means 80-100% of orders convert.
    - Lift (weight: 35%): Affinity multiplier over random chance. A lift > 2.0 indicates a
      powerful organic pairing that is not due to random basket assortment.
    - Support (weight: 20%): Overall basket market penetration across all store transactions.

    A composite score >= 0.60 indicates a dominant, high-yield opportunity.
    """
    score = (confidence * 0.45) + (min(lift / 3.0, 1.0) * 0.35) + (min(support / 0.08, 1.0) * 0.20)
    if score >= 0.60:
        return '✦ High Potential'
    elif score >= 0.35:
        return '✦ Medium Potential'
    return '✦ Emerging Opportunity'


def format_cross_sell_ratio(confidence: float) -> str:
    """
    Format confidence into an intuitive, humanized cross-sell ratio.
    Avoids confusing and ambiguous representations like '~1 in 1'.
    """
    if confidence is None or confidence <= 0:
        return '~1 in 10'
    c = round(confidence * 100 if confidence <= 1.0 else confidence)
    if c >= 95:
        return '100%'
    elif c >= 85:
        return '~9 in 10'
    elif c >= 75:
        return '~4 in 5'
    elif c >= 63:
        return '~2 in 3'
    elif c >= 45:
        return '~1 in 2'
    elif c >= 30:
        return '~1 in 3'
    elif c >= 22:
        return '~1 in 4'
    elif c >= 18:
        return '~1 in 5'
    elif c >= 12:
        return '~1 in 7'
    elif c >= 8:
        return '~1 in 10'
    elif c >= 4:
        return '~1 in 20'
    else:
        denom = max(2, round(100 / max(c, 1)))
        return f"~1 in {denom}"



def synthesize_dynamic_advice(
    category: str,
    insight_type: str,
    ant_name: str,
    cons_name: str,
    support: float,
    confidence: float,
    lift: float,
    velocity_delta: float,
    cat_a: str,
    cat_b: str,
    is_cross_category: bool,
    tx_count: int,
    rank_index: int = 0
) -> dict:
    """
    Intelligent Dynamic Advice Synthesis (Layer 5)
    
    Generates varied, context-aware business insights tailored to the exact
    mathematical signals of each product pairing, strictly avoiding repetitive
    one-line copy across cards.
    """
    pair_label = f"{ant_name} + {cons_name}"
    supp_pct = round(support * 100, 1)
    conf_pct = round(confidence * 100, 1)
    lift_ratio = round(lift, 2)
    vel_pct = round(velocity_delta * 100)

    # Detect product domain affinities (e.g. breakfast/morning vs general retail)
    ant_lower = ant_name.lower()
    cons_lower = cons_name.lower()
    is_beverage_food = any(k in ant_lower for k in ['coffee', 'tea', 'latte', 'espresso', 'drink', 'beverage', 'juice']) and \
                       any(k in cons_lower for k in ['cookie', 'croissant', 'bagel', 'muffin', 'cake', 'bread', 'sandwich', 'cheese'])
    is_breakfast = any(k in ant_lower or k in cons_lower for k in ['coffee', 'croissant', 'bagel', 'egg', 'sandwich', 'pancake', 'breakfast'])

    # ═════════════════════════════════════════════════════════════════════════
    # 1. GROW STRATEGY (Bundle Opportunities)
    # ═════════════════════════════════════════════════════════════════════════
    if category == 'GROW':
        variant = rank_index % 4

        # Variant 0: Core Basket Builder
        if variant == 0:
            chosen_type = 'BASKET_BUILDER'
            context_title = "A winning pairing"
            summary = f"Customers who buy {ant_name} are significantly more likely to also buy {cons_name}, completing their basket together."
            framing_title = "What makes this work"
            rationale = f"It's a classic on-the-go combo that fits naturally together, boosts average order value, and creates a simple, appealing offer."
            action_title = "Suggested bundle"
            suggested_action = f"Consider testing a {ant_name} + {cons_name} bundle or promoting {cons_name} as an add-on to {ant_name}."
            context_tag = "☼ Great for morning rush" if is_breakfast else "☼ Core basket driver"
            considerations = [
                f"Test a bundled price point that offers minor savings (e.g. 5-8%) over individual item purchases.",
                f"Feature {pair_label} together on primary promotional displays or ordering screens.",
                f"Review gross margins on {cons_name} to confirm bundled pricing preserves target profitability."
            ]

        # Variant 1: Routine / Occasion Combo
        elif variant == 1:
            chosen_type = 'OCCASION_BUNDLE'
            context_title = "Complements each other"
            summary = f"These items are frequently purchased together, especially during peak recurring customer routine hours."
            framing_title = "Catering to routine"
            rationale = f"This pairing fits a common customer routine - a refreshing choice and a quick bite, making it easy to add to their order."
            action_title = "Routine strategy"
            suggested_action = f"Consider promoting this bundle at the point of sale or in your featured menu section."
            context_tag = "☕ Perfect for breakfast sets" if is_breakfast else "◈ Routine customer favorite"
            considerations = [
                f"Introduce this pairing as a pre-packaged combo during rush hours to expedite order throughput.",
                f"Brief counter staff on suggestive selling for customers ordering {ant_name} during meal periods.",
                f"Ensure inventory continuity of {cons_name} so high joint demand does not lead to mid-day stockouts."
            ]

        # Variant 2: Natural High-Affinity Synergy
        elif variant == 2:
            chosen_type = 'PRODUCT_PAIRING'
            context_title = "Natural pairing"
            summary = f"Strong organic customer coexistence confirms {cons_name} as a natural companion to {ant_name}."
            framing_title = "Appeal factor"
            rationale = f"It's a simple, satisfying pairing that works reliably across both quick-grab and planned occasion visits."
            action_title = "Merchandising tip"
            suggested_action = f"Consider featuring this bundle in your menu boards or as a suggested add-on during checkout."
            context_tag = f"☆ High affinity ({lift_ratio}x lift)"
            considerations = [
                f"Highlight {cons_name} as a designated recommendation on digital or physical menus.",
                f"Evaluate customer loyalty rewards for purchasing both items concurrently.",
                f"Track period-over-period basket size expansion after introducing joint signage."
            ]

        # Variant 3: Untapped Bundling Opportunity
        else:
            chosen_type = 'GROWTH_HEADROOM'
            context_title = "Untapped bundling opportunity"
            summary = f"Customers frequently pair {ant_name} with {cons_name} without formal promotion, demonstrating latent demand."
            framing_title = "Basket expansion potential"
            rationale = f"Packaging this intuitive combination into an official combo reduces customer decision fatigue and captures unharvested margin."
            action_title = "Promotional test"
            suggested_action = f"May be worth introducing a limited-time {pair_label} promotional set to measure customer uptake."
            context_tag = "⚡ High attach headroom"
            considerations = [
                f"Test a promotional 'Pair of the Week' callout to evaluate elasticity before permanent menu changes.",
                f"Position {ant_name} and {cons_name} adjacent in digital ordering apps or table-tent cards.",
                f"Measure companion product reorder rates among loyalty members over 30 days."
            ]

    # ═════════════════════════════════════════════════════════════════════════
    # 2. SELL MORE STRATEGY (Cross-Selling Opportunities)
    # ═════════════════════════════════════════════════════════════════════════
    elif category == 'SELL_MORE':
        variant = rank_index % 3

        if variant == 0:
            chosen_type = 'CHECKOUT_PROMPT'
            context_title = "High-conversion cross-sell"
            summary = f"Customers purchasing {ant_name} show a strong directional tendency ({conf_pct}% chance) to append {cons_name} before paying."
            framing_title = "Asymmetric purchase flow"
            rationale = f"{ant_name} serves as the primary trip destination, while {cons_name} acts as a frictionless, high-converting companion."
            action_title = "Checkout prompt"
            suggested_action = f"Consider configuring an automated POS or digital cart prompt suggesting {cons_name} whenever {ant_name} is selected."
            context_tag = "⚡ High cross-sell probability"
            considerations = [
                f"Configure checkout prompt: 'Would you like to add {cons_name} today?' during ordering.",
                f"Keep {cons_name} within immediate physical reach of the counter or fulfillment staging area.",
                f"Test 1-tap digital upsell cards on mobile or kiosk ordering interfaces."
            ]

        elif variant == 1:
            chosen_type = 'IMPULSE_COMPANION'
            context_title = "Impulse companion"
            summary = f"When customers order {ant_name}, appending {cons_name} creates an immediate, low-friction basket boost."
            framing_title = "Low decision friction"
            rationale = f"Shoppers perceive {cons_name} as a low-risk, complementary indulgence that requires minimal deliberation."
            action_title = "Point-of-sale display"
            suggested_action = f"Consider positioning {cons_name} directly in the checkout queue or alongside {ant_name} ordering points."
            context_tag = f"↑ {conf_pct}% attach rate"
            considerations = [
                f"Place high-visibility point-of-sale displays for {cons_name} near the final payment area.",
                f"Test suggestive phrasing by staff: 'Would you like to pair your {ant_name} with {cons_name}?'",
                f"Monitor attach rate trajectory over a 14-day promotional trial."
            ]

        else:
            chosen_type = 'VALUE_ACCELERATOR'
            context_title = "Basket value accelerator"
            summary = f"Adding {cons_name} to orders containing {ant_name} consistently expands transaction size with proven conversion."
            framing_title = "Incremental order volume"
            rationale = f"Historical sales demonstrate solid cross-sell readiness without cannibalizing companion category sales."
            action_title = "Companion pricing test"
            suggested_action = f"May be worth testing an exclusive companion price for {cons_name} with every purchase of {ant_name}."
            context_tag = "🎯 High-yield cross-sell"
            considerations = [
                f"Evaluate promotional pairing discounts during mid-day or off-peak hours.",
                f"Feature companion banners on digital ordering channels linking both products.",
                f"Review operational fulfillment speed to ensure cross-selling does not delay queue times."
            ]

    # ═════════════════════════════════════════════════════════════════════════
    # 3. WATCH STRATEGY (Emerging Combinations & Trends)
    # ═════════════════════════════════════════════════════════════════════════
    elif category == 'WATCH':
        if vel_pct > 15:
            chosen_type = 'EMERGING_TREND'
            context_title = "Emerging trend"
            summary = f"Joint basket appearances have surged +{vel_pct}% over recent transactions compared to historical baseline."
            framing_title = "Accelerating momentum"
            rationale = f"Surging transaction velocity signals an evolving customer preference shift or emerging seasonal co-purchase dynamic."
            action_title = "What to watch"
            suggested_action = f"Verify continuity over the next cycle before shifting static printed menus or committing to bulk supplier contracts."
            context_tag = f"☆ Trending up +{vel_pct}%"
            considerations = [
                f"Track daily co-occurrence counts for 14 more days to confirm sustained trend vs transient spike.",
                f"Audit raw ingredient and supplier availability to prevent unexpected stock depletion.",
                f"Observe whether the surge is concentrated during specific dayparts or customer cohorts."
            ]

        elif vel_pct < -15:
            chosen_type = 'DECAYING_RELATIONSHIP'
            context_title = "Cooling affinity"
            summary = f"Co-purchase frequency for {pair_label} has softened by {abs(vel_pct)}% across recent order batches."
            framing_title = "Decoupling indicator"
            rationale = f"Previously steady joint purchasing has decelerated, potentially signaling price sensitivity, seasonal change, or catalog fatigue."
            action_title = "Investigation focus"
            suggested_action = f"Worth observing whether recent price changes or supplier substitutions contributed to the velocity drop."
            context_tag = f"📉 Velocity slowing -{abs(vel_pct)}%"
            considerations = [
                f"Verify whether recent price increases on either product triggered customer resistance.",
                f"Check inventory logs to confirm whether partial stockouts suppressed joint purchases.",
                f"Gather feedback from floor staff regarding changes in customer order preferences."
            ]

        else:
            chosen_type = 'PERIODIC_VARIATION'
            context_title = "Evolving dynamic"
            summary = f"Joint ordering patterns for {pair_label} show periodic clustering and emerging velocity variance."
            framing_title = "Temporal variation"
            rationale = f"Purchasing velocity indicates sensitivity to external cycles such as day of week or calendar promotions."
            action_title = "Observation plan"
            suggested_action = f"Suggest passive observation over the next reporting cycle; avoid immediate pricing or catalog shifts."
            context_tag = "◈ Active observation"
            considerations = [
                f"Compare weekday versus weekend order batches to establish temporal variance baseline.",
                f"Maintain stable catalog positioning during observation to establish a clean analytical baseline.",
                f"Re-evaluate affinity trajectory after 50 additional multi-item transactions are logged."
            ]

    # ═════════════════════════════════════════════════════════════════════════
    # 4. OPTIMIZE STRATEGY (Product Placement Opportunities)
    # ═════════════════════════════════════════════════════════════════════════
    elif category == 'OPTIMIZE':
        variant = rank_index % 2

        if is_cross_category and variant == 0:
            chosen_type = 'CROSS_SECTION_PLACEMENT'
            context_title = "Cross-category synergy"
            summary = f"Shoppers frequently seek out both {ant_name} and {cons_name} despite them belonging to separate catalog sections ({cat_a} and {cat_b})."
            framing_title = "Discovery friction"
            rationale = f"Catalog departmental separation forces shoppers to navigate between disparate sections to build their intended basket."
            action_title = "Suggested placement"
            suggested_action = f"Consider co-locating these items in navigation menus or creating adjacent physical merchandising displays."
            context_tag = "◈ Placement synergy"
            considerations = [
                f"Introduce visual pointers or cross-links to {cons_name} directly within the {cat_a} section.",
                f"Examine floor layout or digital navigation to reduce the number of steps required to add both items.",
                f"Evaluate whether an omnichannel 'Frequently paired together' callout reduces browse abandonments."
            ]

        else:
            chosen_type = 'LAYOUT_OPTIMIZATION'
            context_title = "Catalog discovery opportunity"
            summary = f"High joint affinity between {ant_name} and {cons_name} indicates an opportunity to streamline the ordering journey."
            framing_title = "Layout optimization"
            rationale = f"Customers have already formed the association; bringing the products closer simply makes their desired purchase easier."
            action_title = "Merchandising arrangement"
            suggested_action = f"Consider moving these items physically closer in-store or within digital category navigation."
            context_tag = "⌖ Navigation shortcut"
            considerations = [
                f"Feature combined category collections (e.g., 'Daily Essentials') spanning both items.",
                f"Position endcap displays featuring both items together near primary store traffic flow.",
                f"Measure transaction completion speed before and after reorganizing product placement."
            ]

    # ═════════════════════════════════════════════════════════════════════════
    # 5. REVIEW STRATEGY (Product Attention)
    # ═════════════════════════════════════════════════════════════════════════
    else:  # REVIEW
        variant = rank_index % 3

        if variant == 0 or (lift >= 2.2 and support < 0.03):
            chosen_type = 'LOW_SAMPLE_OUTLIER'
            context_title = "Low-sample outlier"
            summary = f"Elevated lift score ({lift_ratio}x) detected, but low absolute transaction volume warrants cautionary review."
            framing_title = "Sample size verification"
            rationale = f"Sparse sample sizes can produce artificially elevated lift scores that may not hold consistently under larger volumes."
            action_title = "Audit recommendation"
            suggested_action = f"Suggest passive observation; gather more transaction data before executing permanent merchandising changes."
            context_tag = "⏳ Low sample volume"
            considerations = [
                f"Allow 50-100 additional multi-item transactions before establishing fixed bundling policies.",
                f"Track qualitative customer inquiries to determine if organic demand is expanding.",
                f"Avoid significant upfront marketing spend until statistical significance stabilizes."
            ]

        elif variant == 1 or velocity_delta < -0.10:
            chosen_type = 'AFFINITY_VARIANCE'
            context_title = "Affinity variance alert"
            summary = f"Unusual analytical variance or decoupling detected between {ant_name} and {cons_name} relative to baseline expectations."
            framing_title = "Divergent analytical signals"
            rationale = f"Discrepancies between high historical affinity and recent volume contractions often stem from stockouts or price shocks."
            action_title = "Operational check"
            suggested_action = f"Worth reviewing recent price changes, stock availability, or preparation consistency for these items."
            context_tag = "⚠ Needs operational review"
            considerations = [
                f"Audit inventory logs for stockouts or partial fulfillment of {cons_name} during rush hours.",
                f"Check if recent price adjustments on either item altered customer purchasing thresholds.",
                f"Verify that product quality and customer satisfaction ratings remain aligned with expectations."
            ]

        else:
            chosen_type = 'ANALYTICAL_ANOMALY'
            context_title = "Conflicting indicators"
            summary = f"Statistical indicators exhibit unexpected variance between baseline affinity and observed basket pairings."
            framing_title = "Analytical anomaly"
            rationale = f"Elevated lift coupled with uneven distribution across transaction batches suggests possible data skew or erratic purchasing."
            action_title = "Data hygiene review"
            suggested_action = f"Worth reviewing catalog classification, recent promotional records, or bulk order anomalies."
            context_tag = "🔍 Audit candidate"
            considerations = [
                f"Check for wholesale, catering, or bulk-order outliers that may distort baseline statistics.",
                f"Verify that SKU mappings and product names are consistently applied across POS registers.",
                f"Re-run analysis after excluding single-day anomalies or special event transactions."
            ]

    # Humanized narrative statistical behavior statement
    fraction_text = f"1 in every {max(2, round(100 / max(supp_pct, 1)))} orders"
    observed_behavior = f"Appears in {tx_count:,} transactions ({supp_pct}% of total baskets, approximately {fraction_text}). When {ant_name} is in basket, {cons_name} is included with {conf_pct}% conditional probability."

    return {
        'insight_type': chosen_type,
        'summary': summary,
        'context_title': context_title,
        'framing_title': framing_title,
        'action_title': action_title,
        'suggested_action': suggested_action,
        'context_tag': context_tag,
        'rationale': rationale,
        'considerations': considerations,
        'observed_behavior': observed_behavior
    }


class RecommendationEngine:
    """
    Analytical and Advisory Engine for CoBuy Business Recommendations.
    Computes signals, partitions trends, and emits normalized DTOs.
    """

    def __init__(self, user_email: str, dataset_id: int):
        self.user_email = user_email
        self.dataset_id = dataset_id
        self.dataset_info = db.get_dataset_by_id(dataset_id, user_email=user_email) or {}
        self.market_type = self.dataset_info.get('market_type') or 'Default/unknown'
        self.raw_transactions = []
        self.transaction_dates = []
        self.category_map = {}
        self.start_date_str = None
        self.end_date_str = None

    def load_data(self, date_range: str = 'all'):
        """Query Point-of-Sale / eCommerce order line items (Layer 1) with optional date filtering."""
        txs_with_dates = db.get_transactions_with_dates(user_email=self.user_email, dataset_id=self.dataset_id)
        self.category_map = db.get_product_categories_for_dataset(dataset_id=self.dataset_id, user_email=self.user_email) or {}

        if not txs_with_dates:
            txs = db.get_transactions(user_email=self.user_email, dataset_id=self.dataset_id)
            self.raw_transactions = txs or []
            self.transaction_dates = []
            self.start_date_str = None
            self.end_date_str = None
            return

        all_dates = [t['date'] for t in txs_with_dates if t.get('date')]

        range_days_map = {
            '30d': 30,
            '60d': 60,
            '90d': 90
        }
        target_days = range_days_map.get(date_range.lower())

        if target_days and all_dates:
            try:
                clean_dates = []
                for d in all_dates:
                    try:
                        clean_dates.append(datetime.strptime(str(d).strip()[:10], '%Y-%m-%d'))
                    except Exception:
                        pass

                if clean_dates:
                    max_dt = max(clean_dates)
                    cutoff_dt = max_dt - timedelta(days=target_days)
                    cutoff_str = cutoff_dt.strftime('%Y-%m-%d')

                    filtered_txs = [
                        t['items'] for t in txs_with_dates
                        if t.get('date') and str(t['date']).strip()[:10] >= cutoff_str
                    ]

                    # If filtered transactions meet the minimum threshold, use them
                    if len(filtered_txs) >= MIN_TRANSACTIONS_THRESHOLD:
                        self.raw_transactions = filtered_txs
                        self.start_date_str = cutoff_dt.strftime('%b %d, %Y')
                        self.end_date_str = max_dt.strftime('%b %d, %Y')
                        return
            except Exception as e:
                logger.warning(f"Error filtering transactions by date_range {date_range}: {e}")

        # Fallback to all transactions if date_range == 'all', no dates, or slice below threshold
        self.raw_transactions = [t['items'] for t in txs_with_dates]
        if all_dates:
            try:
                clean_dates = [datetime.strptime(str(d).strip()[:10], '%Y-%m-%d') for d in all_dates if d]
                if clean_dates:
                    self.start_date_str = min(clean_dates).strftime('%b %d, %Y')
                    self.end_date_str = max(clean_dates).strftime('%b %d, %Y')
            except Exception:
                pass

    def extract_time_series_slices(self):
        """
        Partitions transactions into Period A (baseline/prior) and Period B (recent)
        to enable mathematically rigorous velocity and trend calculation (Layer 3).
        """
        n = len(self.raw_transactions)
        if n < 6:
            return self.raw_transactions, self.raw_transactions

        # Sequence-based halving (first 50% baseline vs second 50% recent)
        mid = n // 2
        period_a = self.raw_transactions[:mid]
        period_b = self.raw_transactions[mid:]
        return period_a, period_b

    def generate_recommendations(self, category_filter: str = 'ALL', date_range: str = 'all', search: str = '') -> dict:
        """
        Full 7-tier pipeline execution returning normalized payload.
        """
        self.load_data(date_range=date_range)
        total_tx = len(self.raw_transactions)

        # Insufficient data check (Section 12.1)
        if total_tx < MIN_TRANSACTIONS_THRESHOLD:
            return {
                'dataset_id': self.dataset_id,
                'is_insufficient_data': True,
                'message': "Not enough purchasing activity yet. CoBuy needs more transaction volume before establishing reliable patterns for this category.",
                'total_transactions': total_tx,
                'analysis_period': {'start': 'N/A', 'end': 'N/A'},
                'category_counts': {'ALL': 0, 'GROW': 0, 'SELL_MORE': 0, 'WATCH': 0, 'OPTIMIZE': 0, 'REVIEW': 0},
                'recommendations': [],
                'empty_reasons': self._get_empty_reasons()
            }

        # Date window representation
        if self.start_date_str and self.end_date_str:
            analysis_period = {'start': self.start_date_str, 'end': self.end_date_str}
        else:
            upload_date = self.dataset_info.get('upload_date')
            now_dt = datetime.now()
            start_str = (now_dt - timedelta(days=30)).strftime('%b %d, %Y')
            end_str = now_dt.strftime('%b %d, %Y')
            if upload_date:
                try:
                    up_dt = datetime.fromisoformat(str(upload_date).replace('Z', ''))
                    end_str = up_dt.strftime('%b %d, %Y')
                    start_str = (up_dt - timedelta(days=30)).strftime('%b %d, %Y')
                except Exception:
                    pass
            analysis_period = {'start': start_str, 'end': end_str}

        # Layer 2: Analytics Engine (Mining Association Rules)
        te = TransactionEncoder()
        te_ary = te.fit(self.raw_transactions).transform(self.raw_transactions)
        df = pd.DataFrame(te_ary, columns=te.columns_)

        # Adaptive support & confidence
        min_supp = 0.01 if total_tx > 50 else 0.05
        min_conf = 0.15 if total_tx > 50 else 0.20

        try:
            frequent_itemsets = fpgrowth(df, min_support=min_supp, use_colnames=True)
            if frequent_itemsets.empty:
                frequent_itemsets = apriori(df, min_support=max(min_supp / 2, 0.005), use_colnames=True)
            
            if not frequent_itemsets.empty:
                rules_df = association_rules(pd.DataFrame(frequent_itemsets), metric="confidence", min_threshold=min_conf)
            else:
                rules_df = pd.DataFrame()
        except Exception:
            rules_df = pd.DataFrame()

        # Fallback pair extraction if sparse
        if rules_df.empty:
            rules_df = self._synthesize_pair_rules()

        # Layer 3: Signal Interpretation & Trend Velocity
        period_a, period_b = self.extract_time_series_slices()
        freq_a = self._compute_pair_frequencies(period_a)
        freq_b = self._compute_pair_frequencies(period_b)

        raw_candidates = []

        if not rules_df.empty:
            rules_sorted = rules_df.sort_values(by=['lift', 'confidence', 'support'], ascending=[False, False, False])
            
            for _, row in rules_sorted.iterrows():
                ants = sorted(list(row['antecedents']))
                conss = sorted(list(row['consequents']))
                if not ants or not conss:
                    continue

                ant_name = ants[0]
                cons_name = conss[0]
                pair_key = tuple(sorted([ant_name, cons_name]))

                # Anti-Pattern Guardrail: Non-Repetition of Product Entities
                if ant_name.lower() == cons_name.lower():
                    continue

                supp = float(row['support'])
                conf = float(row['confidence'])
                lift = float(row['lift'])
                tx_count = max(1, int(supp * total_tx))

                # Period delta
                p_a_count = freq_a.get(pair_key, 0)
                p_b_count = freq_b.get(pair_key, 0)
                rate_a = p_a_count / max(1, len(period_a))
                rate_b = p_b_count / max(1, len(period_b))
                velocity_delta = ((rate_b - rate_a) / max(0.001, rate_a)) if rate_a > 0 else (1.0 if rate_b > 0 else 0.0)

                cat_a = self.category_map.get(ant_name, 'Uncategorized')
                cat_b = self.category_map.get(cons_name, 'Uncategorized')
                is_cross_category = (cat_a != cat_b and cat_a != 'Uncategorized' and cat_b != 'Uncategorized')

                raw_candidates.append({
                    'ant_name': ant_name,
                    'cons_name': cons_name,
                    'pair_key': pair_key,
                    'support': supp,
                    'confidence': conf,
                    'lift': lift,
                    'tx_count': tx_count,
                    'velocity_delta': velocity_delta,
                    'is_cross_category': is_cross_category,
                    'cat_a': cat_a,
                    'cat_b': cat_b
                })

        # Layer 4: Strategic Categorization Matrix
        categorized_buckets = {
            'GROW': [],
            'SELL_MORE': [],
            'WATCH': [],
            'OPTIMIZE': [],
            'REVIEW': []
        }

        used_pairs_per_cat = {c: set() for c in categorized_buckets}

        for cand in raw_candidates:
            pkey = cand['pair_key']
            supp = cand['support']
            conf = cand['confidence']
            lift = cand['lift']
            vel = cand['velocity_delta']
            is_cross = cand['is_cross_category']

            # Assign to strategic categories according to Spec Section 8
            # Priority 1: WATCH if velocity delta is statistically significant
            if abs(vel) >= 0.15 and pkey not in used_pairs_per_cat['WATCH'] and len(categorized_buckets['WATCH']) < 6:
                cand_copy = dict(cand)
                cand_copy['category'] = 'WATCH'
                cand_copy['insight_type'] = 'EMERGING_TREND' if vel > 0 else 'DECAYING_RELATIONSHIP'
                categorized_buckets['WATCH'].append(cand_copy)
                used_pairs_per_cat['WATCH'].add(pkey)

            # Priority 2: OPTIMIZE if cross-category synergy across disparate catalog sections
            elif is_cross and lift >= 1.2 and pkey not in used_pairs_per_cat['OPTIMIZE'] and len(categorized_buckets['OPTIMIZE']) < 6:
                cand_copy = dict(cand)
                cand_copy['category'] = 'OPTIMIZE'
                cand_copy['insight_type'] = 'MENU_RESTRUCTURING'
                categorized_buckets['OPTIMIZE'].append(cand_copy)
                used_pairs_per_cat['OPTIMIZE'].add(pkey)

            # Priority 3: GROW if high support & high lift (intentional bundling candidates)
            elif supp >= 0.02 and lift >= 1.25 and pkey not in used_pairs_per_cat['GROW'] and len(categorized_buckets['GROW']) < 6:
                cand_copy = dict(cand)
                cand_copy['category'] = 'GROW'
                cand_copy['insight_type'] = 'BASKET_BUILDER'
                categorized_buckets['GROW'].append(cand_copy)
                used_pairs_per_cat['GROW'].add(pkey)

            # Priority 4: SELL MORE if strong directional confidence
            elif conf >= 0.35 and pkey not in used_pairs_per_cat['SELL_MORE'] and len(categorized_buckets['SELL_MORE']) < 6:
                cand_copy = dict(cand)
                cand_copy['category'] = 'SELL_MORE'
                cand_copy['insight_type'] = 'CHECKOUT_PROMPT'
                categorized_buckets['SELL_MORE'].append(cand_copy)
                used_pairs_per_cat['SELL_MORE'].add(pkey)

            # Priority 5: REVIEW for high lift anomalies or low sample outliers
            elif lift >= 2.0 and supp < 0.03 and pkey not in used_pairs_per_cat['REVIEW'] and len(categorized_buckets['REVIEW']) < 6:
                cand_copy = dict(cand)
                cand_copy['category'] = 'REVIEW'
                cand_copy['insight_type'] = 'LOW_SAMPLE_OUTLIER'
                categorized_buckets['REVIEW'].append(cand_copy)
                used_pairs_per_cat['REVIEW'].add(pkey)

        # Distribute remaining candidates evenly if some categories are underpopulated
        for cand in raw_candidates:
            pkey = cand['pair_key']
            for cat, target_len, fallback_type in [
                ('GROW', 3, 'PRODUCT_PAIRING'),
                ('SELL_MORE', 3, 'COMPANION_ITEM'),
                ('WATCH', 2, 'SEASONAL_SHIFT'),
                ('OPTIMIZE', 2, 'DISPLAY_ADJACENCY'),
                ('REVIEW', 1, 'AFFINITY_BREAKDOWN')
            ]:
                if len(categorized_buckets[cat]) < target_len and pkey not in used_pairs_per_cat[cat]:
                    cand_copy = dict(cand)
                    cand_copy['category'] = cat
                    cand_copy['insight_type'] = fallback_type
                    categorized_buckets[cat].append(cand_copy)
                    used_pairs_per_cat[cat].add(pkey)
                    break

        # Layer 5 & 6: Dynamic Advice Synthesis & Normalized BusinessRecommendation DTOs
        all_recommendations = []
        category_counts = {
            'ALL': 0,
            'GROW': len(categorized_buckets['GROW']),
            'SELL_MORE': len(categorized_buckets['SELL_MORE']),
            'WATCH': len(categorized_buckets['WATCH']),
            'OPTIMIZE': len(categorized_buckets['OPTIMIZE']),
            'REVIEW': len(categorized_buckets['REVIEW'])
        }

        priority_counter = 1
        for cat in ['GROW', 'SELL_MORE', 'WATCH', 'OPTIMIZE', 'REVIEW']:
            items_in_cat = categorized_buckets[cat]
            for idx, item in enumerate(items_in_cat):
                ant = item['ant_name']
                cons = item['cons_name']
                supp_pct = round(item['support'] * 100, 1)
                conf_pct = round(item['confidence'] * 100, 1)
                lift_ratio = round(item['lift'], 2)
                tx_count = item['tx_count']
                ins_type = item.get('insight_type', 'BASKET_BUILDER')

                # Smart dynamic advice synthesis
                advice = synthesize_dynamic_advice(
                    category=cat,
                    insight_type=ins_type,
                    ant_name=ant,
                    cons_name=cons,
                    support=item['support'],
                    confidence=item['confidence'],
                    lift=item['lift'],
                    velocity_delta=item.get('velocity_delta', 0.0),
                    cat_a=item.get('cat_a', 'Uncategorized'),
                    cat_b=item.get('cat_b', 'Uncategorized'),
                    is_cross_category=item.get('is_cross_category', False),
                    tx_count=tx_count,
                    rank_index=idx
                )

                rec_id = generate_recommendation_id(cat, [ant, cons])
                badge = resolve_potential_badge(item['confidence'], item['lift'], item['support'])

                rec_dto = {
                    'id': rec_id,
                    'category': cat,
                    'insightType': advice.get('insight_type', ins_type),
                    'priority': priority_counter,
                    'potentialBadge': badge,
                    'products': [
                        {'id': f"prod-{abs(hash(ant)) % 10000}", 'name': ant, 'sku': f"SKU-{abs(hash(ant)) % 100000:05d}"},
                        {'id': f"prod-{abs(hash(cons)) % 10000}", 'name': cons, 'sku': f"SKU-{abs(hash(cons)) % 100000:05d}"}
                    ],
                    'summary': advice['summary'],
                    'context': advice['context_title'],
                    'contextTag': advice['context_tag'],
                    'suggestedAction': advice['suggested_action'],
                    'details': {
                        'framingTitle': advice['framing_title'],
                        'actionTitle': advice['action_title'],
                        'rationale': advice['rationale'],
                        'observedBehavior': advice['observed_behavior'],
                        'considerations': advice['considerations'],
                        'supportingData': {
                            'supportPct': supp_pct,
                            'confidencePct': conf_pct,
                            'liftRatio': lift_ratio,
                            'transactionCount': tx_count,
                            'crossSellRatio': format_cross_sell_ratio(item['confidence'])
                        }
                    },
                    'analysisPeriod': analysis_period
                }

                all_recommendations.append(rec_dto)
                priority_counter += 1

        category_counts['ALL'] = len(all_recommendations)

        # Apply filtering
        filtered_recs = all_recommendations
        if category_filter and category_filter.upper() != 'ALL':
            filtered_recs = [r for r in filtered_recs if r['category'] == category_filter.upper()]

        if search and search.strip():
            q = search.strip().lower()
            filtered_recs = [
                r for r in filtered_recs
                if any(q in p['name'].lower() for p in r['products'])
                or q in r['summary'].lower()
                or q in r['context'].lower()
            ]

        return {
            'dataset_id': self.dataset_id,
            'is_insufficient_data': False,
            'analysis_period': analysis_period,
            'total_transactions': total_tx,
            'category_counts': category_counts,
            'recommendations': filtered_recs,
            'empty_reasons': self._get_empty_reasons()
        }

    def _synthesize_pair_rules(self) -> pd.DataFrame:
        """Derive pairwise co-occurrence rules when standard mining yields sparse rules."""
        pair_counts = {}
        item_counts = {}
        total_tx = len(self.raw_transactions)

        for tx in self.raw_transactions:
            unique_items = sorted(list(set([str(it).strip() for it in tx if it])))
            for it in unique_items:
                item_counts[it] = item_counts.get(it, 0) + 1
            for i in range(len(unique_items)):
                for j in range(i + 1, len(unique_items)):
                    pair = (unique_items[i], unique_items[j])
                    pair_counts[pair] = pair_counts.get(pair, 0) + 1

        co_rules = []
        for (a, b), cnt in pair_counts.items():
            if cnt < 2 and total_tx > 20:
                continue
            sup_ab = cnt / total_tx
            sup_a = item_counts[a] / total_tx
            sup_b = item_counts[b] / total_tx
            conf_ab = cnt / item_counts[a]
            conf_ba = cnt / item_counts[b]
            lift_ab = conf_ab / sup_b if sup_b > 0 else 1.0
            lift_ba = conf_ba / sup_a if sup_a > 0 else 1.0

            co_rules.append({
                'antecedents': frozenset([a]),
                'consequents': frozenset([b]),
                'support': sup_ab,
                'confidence': conf_ab,
                'lift': lift_ab
            })
            co_rules.append({
                'antecedents': frozenset([b]),
                'consequents': frozenset([a]),
                'support': sup_ab,
                'confidence': conf_ba,
                'lift': lift_ba
            })

        if co_rules:
            return pd.DataFrame(co_rules).sort_values(by=['confidence', 'support'], ascending=[False, False]).head(80)
        return pd.DataFrame()

    def _compute_pair_frequencies(self, transactions_slice: list) -> dict:
        """Compute co-occurrence frequencies across a slice of transactions."""
        freqs = {}
        for tx in transactions_slice:
            items = sorted(list(set([str(it).strip() for it in tx if it])))
            for i in range(len(items)):
                for j in range(i + 1, len(items)):
                    pair = (items[i], items[j])
                    freqs[pair] = freqs.get(pair, 0) + 1
        return freqs

    def _get_empty_reasons(self) -> dict:
        """Category-specific informative empty state copy (Section 12.2)."""
        return {
            'ALL': "No purchasing patterns pass current analytical significance thresholds in this dataset.",
            'GROW': "No established high-support bundle opportunities meet statistical significance yet. As more multi-item orders are processed, bundling candidates will emerge here.",
            'SELL_MORE': "No strong directional cross-sell opportunities detected under current thresholds. Transactions show balanced item selections.",
            'WATCH': "No significant purchasing shifts detected during the selected date window. Associations remain within normal variance.",
            'OPTIMIZE': "Cross-category placement affinities are currently well-aligned. No disparate catalog navigation frictions detected.",
            'REVIEW': "No anomalous or conflicting purchasing signals detected. Catalog affinities are performing consistently."
        }
