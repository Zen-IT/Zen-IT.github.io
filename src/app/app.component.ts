import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { CommonModule, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    CommonModule,
    MatTableModule, 
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    DatePipe ],
  providers: [ {provide: MAT_DATE_LOCALE, useValue: 'de-DE'},provideNativeDateAdapter()] ,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {

  displayedPersonColumns: string[] = ['name', 'from', 'to', 'hours', 'delete'];
  displayedStationsColumns: string[] = ['name', 'delete'];
  persons : Person[] = [];
  shifts : Shift[] = [];
  stations : string[] = [];
  from : Date = new Date();
  to : Date = new Date();

  shiftStart : Date = new Date();
  shiftLength : number = 8;

  shiftPlans : ShiftPlan[] = [];

  shiftCalculating : boolean = false;

  @ViewChild('personsTable') personsTable: MatTable<Person>; 
  @ViewChild('stationsTable') stationsTable: MatTable<Shift>;

  ngAfterViewInit(): void {
    this.from = new Date('2025-06-16T00:00:00.000+02:00');
    this.to = new Date('2025-07-01T00:00:00.000+02:00');
    
    this.shiftStart  = new Date('2025-06-16T06:00:00.000+02:00')
    this.shiftLength = 8;
    this.calcShifts();

    for(var i=0;i<100;++i) {
      let person = new Person();
      if(i<10)
        person.name = "00";
      else 
        person.name = "0";
      person.name += i.toString();
      person.from = new Date(this.from.valueOf());
      let addedFromDays = this.randomInt(4);
      person.from = this.addDays(person.from,addedFromDays);
      person.from = new Date(person.from.valueOf() + this.getTimeOfDayInMs(this.shifts[this.randomInt(2)].from));
      person.to = new Date(this.to.valueOf());
      let addedToDays = this.randomInt(16-addedFromDays-4);
      person.to = this.addDays(person.to,-addedToDays);
      person.to = new Date(person.to.valueOf() + this.getTimeOfDayInMs(this.shifts[this.randomInt(2)].to));
      this.persons.push(person)
    }    
    this.personsTable.renderRows();

    for(var i=0;i<3;++i)
      this.stations.push("Station "+(i+1));
    this.stationsTable.renderRows();
  }

  public addDays(date: Date, days: number) : Date {
    var date = new Date(date.valueOf());
    date.setDate(date.getDate() + days);
    return date;
  }

  public randomInt(max:number): number {
    return Math.round(Math.random()*max);
  }

  public addPerson() {
    this.persons.push(new Person());
    this.personsTable.renderRows();
  }

  public removePerson(person: Person) {
    this.persons.splice(this.persons.indexOf(person),1);
    this.personsTable.renderRows();
  }

  public addStation() {
    this.stations.push("Neue Station");
    this.stationsTable.renderRows();
  }

  public removeStation(station: string) {
    this.stations.splice(this.stations.indexOf(station),1);
    this.stationsTable.renderRows();
  }

  public calcShifts() {
    this.shifts = [];
    if(24%this.shiftLength != 0) {
      return;
    }
    let shift = new Shift();
    shift.name="S1";
    shift.from = new Date(this.getDateOnlyInMs(this.from)+this.getTimeOfDayInMs(this.shiftStart));
    shift.to = new Date(shift.from.getTime() + (this.shiftLength * 60 * 60 * 1000));
    this.shifts.push(shift);
    while(this.getTimeOfDayInMs(this.shifts[0].from)!=this.getTimeOfDayInMs(shift.to)) {
      shift = new Shift();
      shift.name = "S"+(this.shifts.length+1).toString();
      shift.from = this.shifts[this.shifts.length-1].to;
      shift.to = new Date(shift.from.getTime() + (this.shiftLength * 60 * 60 * 1000));
      this.shifts.push(shift);
    }
  }

  public orderByLength(persons : Person[]): Person[] {

    return [...persons].sort((a,b)=> a.hours - b.hours )
  }

  public orderByShiftCount(persons : Person[]): Person[] {
    return [...persons].sort((a,b)=> a.shiftEntries.length - b.shiftEntries.length )
  }

  public filterForAvailability(persons : Person[], from : Date, to:Date): Person[] {
    return this.orderByLength([...persons].filter(p => {
      if(p.shiftEntries.length==0) {
        if(from < new Date('2025-06-16T00:12:00.000+02:00')) {
          console.log(p.from);
          console.log(from);
          console.log(p.to);
          console.log(to);
        }
        return p.from <= from && p.to >= to;
      } else {
        if(p.shiftEntries.length == 3)
          return false;

        let exists = p.from <= from && p.to >= to;
        let diffGreater12h = true;
        for(var i=0;i<p.shiftEntries.length;++i) {
          var toToFrom = Math.abs(to.valueOf() - p.shiftEntries[i].from.valueOf())/1000/60/60;
          var fromToTo = Math.abs(from.valueOf() - p.shiftEntries[i].to.valueOf())/1000/60/60;
          if(fromToTo < 12 || toToFrom < 12 ) {
            diffGreater12h = false;
            break;
          }
        }      
        return exists && diffGreater12h;
      }
    }));
  }

  public onTabChange(eventData : MatTabChangeEvent) {
    if(eventData.index == 3) {
      this.shiftCalculating = true;
      this.createShiftPlan();
      this.shiftCalculating = false;
    }
  }

  public createShiftPlan() {
    console.log("creating")
    this.shiftPlans = [];
    for(var i=0;i<this.persons.length;++i)
      this.persons[i].shiftEntries = [];

    if(this.shifts.length==0 || this.stations.length == 0)
      return;

    for(var i=0;i<this.stations.length;++i) {
      let sp = new ShiftPlan();
      sp.stationName = this.stations[i];
      this.shiftPlans.push(sp);
    }

    this.shifts = this.shifts.sort((a,b) => a.from.valueOf() - b.from.valueOf());

    var curDate = new Date(this.getDateOnlyInMs(this.from) + this.getTimeOfDayInMs(this.shifts[0].from));
    var shiftCt = 0;
    while (new Date(curDate.getTime() + (this.shifts[shiftCt].to.getTime() - this.shifts[shiftCt].from.getTime())) < this.to) {
      let from = curDate;
      curDate = new Date(curDate.getTime() + (this.shifts[shiftCt].to.getTime() - this.shifts[shiftCt].from.getTime()));
      let to = curDate;
      
      for(var i=0;i<this.shiftPlans.length;++i) {
        let sp = this.shiftPlans[i];
        let se = new ShiftEntry();
        se.from = from;
        se.to = to;
        se.shift = this.shifts[shiftCt];
        sp.shiftEntries.push(se);
      }

      shiftCt++;
      if(shiftCt == this.shifts.length) {
        shiftCt = 0;
      }
    }

    for(var i=0;i<this.shiftPlans[0].shiftEntries.length;++i) {
      let curFrom = this.shiftPlans[0].shiftEntries[i].from;
      let curTo = this.shiftPlans[0].shiftEntries[i].to;
      // find 6 available people
      let availablePersons = this.filterForAvailability(this.persons,curFrom,curTo);
      availablePersons = this.orderByLength(availablePersons);
      for(var j=0;j<this.shiftPlans.length;++j) {
        let entry = this.shiftPlans[j].shiftEntries[i]; 
        if(availablePersons[j*2]) {
          entry.person1 = availablePersons[j*2];
          availablePersons[j*2].shiftEntries.push(entry);
        }
        if(availablePersons[j*2+1]) {
          entry.person2 = availablePersons[j*2+1];
          availablePersons[j*2+1].shiftEntries.push(entry);
        }        
      }
    }  
    for(var i=0;i<this.persons.length;++i) {
      this.persons[i].shiftEntries.sort((a,b) => a.from.valueOf() - b.from.valueOf())
    }
  }

  public getTimeOfDayInMs(date:Date):number {
    return date.getTime() - new Date(date.toDateString()).getTime();
  }

  public getDateOnlyInMs(date:Date):number {
    return date.getTime() - this.getTimeOfDayInMs(date);
  }

  public getDiffToNextShift(person: Person,i: number) : number {
    let from = person.shiftEntries[i].to;
    let to = person.shiftEntries[i+1].from;
    return (to.valueOf() - from.valueOf())/1000/60/60;
  }
}

export class Person {
  name : string = "X";
  from : Date = new Date();
  to : Date = new Date();
  shiftEntries : ShiftEntry[] = [];
  get hours() {
    return Math.abs(this.from.valueOf() - this.to.valueOf()) / 1000 / 60 / 60;
  }
}

export class ShiftEntry {
  from: Date = new Date();
  to: Date = new Date();
  shift: Shift = new Shift();
  person1 : Person = new Person();
  person2 : Person = new Person();
}

export class Shift {
  name : string = "New Shift";
  from: Date = new Date();
  to: Date = new Date();
}

export class ShiftPlan {
  stationName : string = "New Shift Plan";
  shiftEntries: ShiftEntry[] = [];
}
