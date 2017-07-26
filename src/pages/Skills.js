import React, { Component, } from 'react';
import ReactList from 'react-list';
import {
  Checkbox,
  Col,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
  Grid,
  ListGroup,
  ListGroupItem,
  Media,
  Panel,
  Row,
} from 'react-bootstrap';

import { filterByText, filterByCheckbox, } from '../util/filters';
import { imagePath, } from '../util/imagePath';
import { resolve, } from '../util/resolve';
import { toTitleCase, } from '../util/toTitleCase';
import { parseURL, updateURL, } from '../util/url';
const skillData = require('../Decrypted/filtered_spskill.json');
const heroData = require('../Decrypted/filtered_character_visual.json');

function unlockCondition(data) {
  if (data.type === 'NONE') {
    return 'None';
  } else if (data.type === 'SPECIFIC') {
    let hero;
    if ('type_target' in data) { // acquire specific hero
      hero = resolve(heroData.filter(i => i.id === data.type_target)[0].name);
    } else if ('type_target_list' in data) { // acquire list of specific heroes
      hero = heroData
        .filter(i => data.type_target_list.includes(i.id))
        .map(i => resolve(i.name))
        .join(', ');
    }
    return resolve(data.type_text)
      .replace(/Acquired/, 'Acquire')
      .replace(/\{0\}/, hero);
  } else if (data.type === 'SEPARATE') { // acquire x amount of class heroes
    return resolve(data.type_text)
      .replace(/Acquired/, 'Acquire')
      .replace(/\{1\}/, data.type_value)
      .replace(/\{0\}/, resolve(`TEXT_CLASS_${data.type_target.substring(4)}`).toLowerCase() + 's');
  } else if (data.type === 'ONLY_HUGE') {
    return `Get 'Great Success!'`;
  }
  return 'null'; // should never reach here
}

const filterCategories = ['Level', 'Class',];

const data = skillData.map(i => {
  // make skill's filterable object
  const f = [
    i.unlockcond.next_id === 'MAX' ? 'Max' : '',
    i.class === 'KOF' ? i.class : resolve('TEXT_CLASS_' + i.class.substring(4)),
  ];

  const filterable = {};
  filterCategories.forEach((i, index) => filterable[i] = f[index]);

  return {
    image: i.icon,
    filterable: filterable,
    name: resolve(i.name),
    level: i.level,
    description: resolve(i.desc).replace(/@|#|\$/g, ''),
    type: resolve(i.simpledesc),
    cost: i.cost.map(j => `${toTitleCase(j.type)}: ${j.value}`).join(', '),
    rate: i.huge === -1 ? '-' : `${parseInt(i.huge * 100, 10)}%`,
    unlockCondition: unlockCondition(i.unlockcond),
  };
});

// initialize checkboxes
const checkboxes = {
  Level: ['Max',],
  Class: ['Warrior', 'Paladin', 'Archer', 'Hunter', 'Wizard', 'Priest', 'KOF',],
};

//console.log(data, checkboxes);

export default class Skills extends Component {
  state = {
    textFilter: '',
    checkboxFilters: {},
    render: [],
  }

  componentWillMount = () => {
    this.timer = null;
    const [textFilter, checkboxFilters] = parseURL(checkboxes);
    const processed = filterByCheckbox(filterByText(data, textFilter), checkboxFilters);
    const render = processed.map(this.renderListGroupItem);

    this.setState({textFilter, checkboxFilters, render,});
  }

  componentWillReceiveProps = () => {
    this.componentWillMount();
  }

  renderListGroupItem = (skill) => {
    return (
      <ListGroupItem key={`${skill.name}${skill.level}`}>
        <Media>
          <Grid fluid>
            <Row>
              <Col style={{padding: 0,}} lg={2} md={3} sm={4} xs={5}>
                <Media.Left style={{display: 'flex', justifyContent: 'center',}}>
                  <img width={'50%'} height={'50%'} alt='' src={imagePath('cq-assets', `skills/${skill.image}.png`)} />
                </Media.Left>
              </Col>
              <Col style={{padding: 0,}} lg={10} md={9} sm={8} xs={7}>
                <Media.Body>
                  <Media.Heading>{`${skill.name} (Lv. ${skill.level}${!skill.filterable.Level ? '' : ', '}${skill.filterable.Level})`}</Media.Heading>
                  <p>{`${skill.filterable.Class} | ${skill.type} | ${skill.cost} | Rate: ${skill.rate} | ${skill.unlockCondition}`}</p>
                  <p>{skill.description}</p>
                </Media.Body>
              </Col>
            </Row>
          </Grid>
        </Media>
      </ListGroupItem>
    );
  }

  changeView = () => {
    updateURL(
      this.state.textFilter,
      this.state.checkboxFilters,
    );
    const processed = filterByCheckbox(filterByText(data, this.state.textFilter), this.state.checkboxFilters)

    this.setState({ render: processed.map(this.renderListGroupItem), });
  }

  handleTextChange = (e) => {
    if (e.target.value.includes('\n')) { return; }

    clearTimeout(this.timer);
    this.setState({ textFilter: e.target.value, }, () => {
      this.timer = setTimeout(() => this.changeView(), 500);
    });
  }

  handleCheckbox = (e) => {
    const [key, value] = e.target.name.split('&');
    const checkboxFilters = this.state.checkboxFilters;
    checkboxFilters[key][value] = e.target.checked;

    this.setState({ checkboxFilters: checkboxFilters,}, () => this.changeView());
  }

  renderCheckbox = (category, label) => {
    const isChecked = this.state.checkboxFilters[category][label];
    return (
      <Checkbox defaultChecked={isChecked} inline key={`${label}${isChecked}`} name={`${category}&${label}`} onChange={this.handleCheckbox}>
        {label}
      </Checkbox>
    );
  }

  renderCheckboxes = () => {
    return (
      Object.keys(checkboxes).map(i => (
        <FormGroup key={i}>
          <Col componentClass={ControlLabel} lg={2} md={3} sm={4} xs={12}>{i}</Col>
          <Col lg={10} md={9} sm={8} xs={12}>{checkboxes[i].map(j => this.renderCheckbox(i, j))}</Col>
        </FormGroup>
      ))
    );
  }

  render = () => {
    return (
      <Row>
        <Col lg={12} md={12} sm={12} xs={12}>
          <Panel collapsible defaultExpanded header='Filters'>
            <Form horizontal>
              <FormGroup>
                <Col componentClass={ControlLabel} lg={2} md={3} sm={4} xs={12}>Name</Col>
                <Col lg={10} md={9} sm={8} xs={12}>
                  <FormControl
                    componentClass='textarea'
                    onChange={this.handleTextChange}
                    style={{height: '34px', resize: 'none',}}
                    value={this.state.textFilter}
                  />
                </Col>
              </FormGroup>
              {this.renderCheckboxes()}
            </Form>
          </Panel>
          <Panel collapsible defaultExpanded header={`Skills (${this.state.render.length})`}>
            <ListGroup fill>
              <ReactList
                itemRenderer={i => this.state.render[i]}
                length={this.state.render.length}
                minSize={10}
              />
            </ListGroup>
          </Panel>
        </Col>
      </Row>
    );
  }
}